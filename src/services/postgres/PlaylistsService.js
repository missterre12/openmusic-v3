/* eslint-disable no-useless-catch */
/* eslint-disable max-len */
const { Pool } = require('pg');
const { nanoid } = require('nanoid');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBToModelPlaylists } = require('../../utils');
const CollaborationsService = require('./CollaborationsService');

class PlaylistsService {
  constructor() {
    this._pool = new Pool();
    this._collaborationsService = new CollaborationsService();
  }

  async addPlaylists({ name, owner }) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlists VALUES($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: 'SELECT playlists.*, users.username FROM playlists INNER JOIN users ON playlists.owner=users.id WHERE playlists.owner = $1',
      values: [owner],
    };

    const result = await this._pool.query(query);
    const mapResult = result.rows.map(mapDBToModelPlaylists);

    return mapResult;
  }

  async getPlaylistById(id) {
    const query = {
      text: `
            SELECT 
                playlists.id, 
                playlists.name, 
                users.username, 
                ARRAY_AGG(
                JSON_BUILD_OBJECT(
                    'id', songs.id,
                    'title', songs.title,
                    'performer', songs.performer
                )
                ORDER BY songs.title ASC
                ) songs
            FROM playlists_songs
            INNER JOIN playlists ON playlists_songs.playlist_id = playlists.id
            INNER JOIN users ON playlists.owner = users.id
            INNER JOIN songs ON playlists_songs.song_id = songs.id
            WHERE playlist_id = $1
            GROUP BY playlists.id, users.username`,
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    return result.rows[0];
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async addPlaylistsSong(playlistId, songId) {
    const id = nanoid(16);

    const query = {
      text: 'INSERT INTO playlists_songs VALUES($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist song gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async deletePlaylistSongById(playlistId, songId) {
    const query = {
      text: 'DELETE FROM playlists_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist gagal dihapus. Id tidak ditemukan');
    }
  }

  async verifyPlaylistOwner(playlistId, owner) {
    try {
      const query = {
        text: `
          SELECT p.owner as owner, c.user_id as user_id
          FROM playlists p
          LEFT JOIN collaborations c ON p.id = c.playlist_id AND c.user_id = $1
          WHERE p.id = $2
        `,
        values: [owner, playlistId],
      };

      const result = await this._pool.query(query);

      if (result.rows.length === 0) {
        throw new NotFoundError('Playlist not found');
      }

      const playlist = result.rows[0];
      if (!playlist.owner) {
        throw new NotFoundError('Playlist has no owner');
      }
      if (playlist.owner !== owner && playlist.user_id !== owner) {
        throw new AuthorizationError('You are not authorized to modify this playlist');
      }
    } catch (error) {
      throw error;
    }
  }

  async verifySongIsExist(songId) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Song tidak ditemukan');
    }
  }

  async verifyPlaylistAccess(playlistId, userId) {
    try {
      await this.verifyPlaylistOwner(playlistId, userId);
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }

      try {
        await this._collaborationsService.verifyCollaborator(playlistId, userId);
      } catch (error) {
        throw error;
      }
    }
  }

  async verifyPlaylistAccessForActivity(playlistId, userId) {
    try {
      const playlistExists = await this.getPlaylistById(playlistId);
      if (!playlistExists) {
        throw new NotFoundError('Playlist not found');
      }

      const isCollaborator = await this._collaborationsService.verifyCollaborator(playlistId, userId);
      if (!isCollaborator) {
        throw new AuthorizationError('You are not authorized to view activities for this playlist');
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PlaylistsService;
