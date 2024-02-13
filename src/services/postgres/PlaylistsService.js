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
      text: 'SELECT playlists.*, users.username FROM playlists INNER JOIN users ON playlists.owner = users.id LEFT JOIN collaborations c ON playlists.id = playlist_id WHERE playlists.owner = $1 OR c.user_id = $1',
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

  async getPlaylistSongsById(playlistId) {
    const query = {
      text: `
            SELECT 
                songs.id, 
                songs.title, 
                songs.performer
            FROM playlists_songs
            INNER JOIN songs ON playlists_songs.song_id = songs.id
            WHERE playlist_id = $1
            `,
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Lagu dalam playlist tidak ditemukan');
    }

    return result.rows;
  }

  async verifyPlaylistOwner(playlistId, owner) {
    try {
      const query = {
        text: `
          SELECT owner FROM playlists WHERE id = $1
        `,
        values: [playlistId],
      };

      const result = await this._pool.query(query);
      if (result.rows.length === 0) {
        throw new NotFoundError('Playlist not found');
      }

      const playlist = result.rows[0];
      if (!playlist.owner) {
        throw new NotFoundError('Playlist has no owner');
      }
      if (playlist.owner !== owner) {
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
      if (error instanceof NotFoundError) {
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

  async getPlaylistsActivities(playlistId) {
    const query = {
      text: 'SELECT psa.*, u.username, s.title FROM playlist_song_activities psa INNER JOIN users u ON psa.user_id = u.id INNER JOIN songs s ON psa.song_id = s.id WHERE psa.playlist_id = $1',
      values: [playlistId],
    };

    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('Playlist is not found');
    }

    return result.rows.map((row) => ({
      username: row.username,
      title: row.title,
      action: row.action,
      time: row.time,
    }));
  }
}

module.exports = PlaylistsService;
