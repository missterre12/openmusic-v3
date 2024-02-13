const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBToModelAlbum } = require('../../utils');
const ClientError = require('../../exceptions/ClientError');
const CacheService = require('../redis/CacheService');

class AlbumsService {
  constructor() {
    this._pool = new Pool();
    this._cacheService = new CacheService();
  }

  async addAlbum({ name, year }) {
    const id = nanoid(16);
    const query = {
      text: 'INSERT INTO albums(id, name, year) VALUES($1, $2, $3) RETURNING id',
      values: [id, name, year],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Album gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getAlbumById(albumId, id) {
    const queryAlbum = {
      text: 'SELECT * FROM albums WHERE id = $1',
      values: [albumId],
    };

    const querySongs = {
      text: 'SELECT id, title, performer FROM songs WHERE album_id = $1',
      values: [id],
    };

    const resultAlbum = await this._pool.query(queryAlbum);
    const resultSongs = await this._pool.query(querySongs);
    if (!resultAlbum.rows.length) {
      throw new NotFoundError('Album tidak ditemukan');
    }
    const album = resultAlbum.rows[0];
    const result = {
      id: album.id,
      name: album.name,
      year: album.year,
      songs: resultSongs.rows,
      coverUrl: album.coverUrl || null,
    };

    return result;
  }

  async getSongList(albumId) {
    const query = {
      text: 'SELECT * FROM songs WHERE album_id = $1',
      values: [albumId],
    };

    const result = await this._pool.query(query);
    return (result.rows);
  }

  async editAlbumById(albumId, { name, year }) {
    await this.getAlbumById(albumId);

    const query = {
      text: 'UPDATE albums SET name = $1, year = $2 WHERE id = $3 RETURNING *',
      values: [name, year, albumId],
    };

    const result = await this._pool.query(query);

    if (result.rows.length === 0) {
      throw new NotFoundError('Gagal memperbarui album. Id tidak ditemukan');
    }

    return mapDBToModelAlbum(result.rows[0]);
  }

  async deleteAlbumById(albumId) {
    const query = {
      text: 'DELETE FROM albums WHERE id = $1',
      values: [albumId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Album gagal dihapus. Id tidak ditemukan');
    }
  }

  async addCover(id, filename) {
    const query = {
      text: 'UPDATE albums SET "coverUrl" = $1 WHERE id = $2 RETURNING id',
      values: [filename, id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Album gagal diperbarui. Id tidak ditemukan.');
    }
  }

  async addLike(albumId, userId) {
    const id = `like-${nanoid(16)}`;

    const queryLikeCheck = {
      text: `SELECT id FROM user_likes_album 
      WHERE user_id = $1 AND album_id = $2`,
      values: [userId, albumId],
    };

    const resultCheck = await this._pool.query(queryLikeCheck);
    if (!resultCheck.rows.length) {
      const query = {
        text: 'INSERT INTO user_likes_album VALUES($1, $2, $3) RETURNING id',
        values: [id, userId, albumId],
      };

      const result = await this._pool.query(query);
      if (!result.rows[0].id) {
        throw new InvariantError('Gagal menambahkan like');
      }
    } else {
      throw new ClientError(
        'Gagal menambahkan like. Album sudah dilike.',
      );
    }
    await this._cacheService.delete(`likes:${albumId}`);
  }

  async deleteLike(albumId, userId) {
    const query = {
      text: `DELETE FROM user_likes_album 
      WHERE user_id = $1 AND album_id = $2 
      RETURNING id`,
      values: [userId, albumId],
    };

    const result = await this._pool.query(query);
    if (!result.rows.length) {
      throw new NotFoundError('Gagal menghapus like');
    }
    await this._cacheService.delete(`likes:${albumId}`);
  }

  async getLikes(albumId) {
    try {
      const result = await this._cacheService.get(`likes:${albumId}`);
      const likes = JSON.parse(result);
      return {
        cache: true,
        likes,
      };
    } catch (error) {
      const query = {
        text: 'SELECT COUNT(*) FROM user_likes_album WHERE album_id = $1',
        values: [albumId],
      };

      const result = await this._pool.query(query);
      if (!result.rows.length) {
        throw new NotFoundError('Gagal mengambil like');
      }

      const likes = parseInt(result.rows[0].count, 10);

      await this._cacheService.set(`likes:${albumId}`, likes);
      return {
        cache: false,
        likes,
      };
    }
  }
}

module.exports = AlbumsService;
