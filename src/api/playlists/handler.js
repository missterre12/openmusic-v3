const autoBind = require('auto-bind');
const AuthorizationError = require('../../exceptions/AuthorizationError');

class PlaylistsHandler {
  constructor(playlistsService, collaborationsService, validator) {
    this._playlistsService = playlistsService;
    this._collaborationsService = collaborationsService;
    this._validator = validator;

    autoBind(this);
  }

  async postPlaylistHandler(request, h) {
    const { name } = request.payload;
    const { id: owner } = request.auth.credentials;

    this._validator.validatePlaylistPayload(request.payload);

    const playlistId = await this._playlistsService.addPlaylists({
      name,
      owner,
    });

    const response = h.response({
      status: 'success',
      message: 'Playlist berhasil ditambahkan',
      data: {
        playlistId,
      },
    });
    response.code(201);
    return response;
  }

  async getPlaylistsHandler(request) {
    const { id: credentialId } = request.auth.credentials;
    const playlists = await this._playlistsService.getPlaylists(credentialId);

    console.log('Number of Playlists:', playlists.length);

    return {
      status: 'success',
      data: {
        playlists,
      },
    };
  }

  async deletePlaylistByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistOwner(id, credentialId);
    await this._playlistsService.deletePlaylistById(id, credentialId);

    return {
      status: 'success',
      message: 'Playlist berhasil dihapus',
    };
  }

  async postPlaylistSongsByIdHandler(request, h) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: owner } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, owner);
    await this._playlistsService.verifySongIsExist(songId);
    await this._playlistsService.addPlaylistsSong(playlistId, songId);

    const userId = owner;
    const action = 'add';
    await this._collaborationsService.addCollaborationActivity(
      playlistId,
      songId,
      userId,
      action,
    );

    const response = h.response({
      status: 'success',
      message: 'Playlist song berhasil ditambahkan',
    });
    response.code(201);
    return response;
  }

  async getPlaylistSongsByIdHandler(request) {
    const { id } = request.params;
    const { id: userId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(id, userId);

    const playlist = await this._playlistsService.getPlaylistById(id);

    return {
      status: 'success',
      data: {
        playlist,
      },
    };
  }

  async deletePlaylistSongsByIdHandler(request) {
    this._validator.validatePlaylistSongPayload(request.payload);
    const { id: playlistId } = request.params;
    const { songId } = request.payload;
    const { id: owner } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, owner);
    await this._playlistsService.deletePlaylistSongById(playlistId, songId);

    const userId = owner;
    const action = 'delete';
    await this._collaborationsService.addCollaborationActivity(
      playlistId,
      songId,
      userId,
      action,
    );

    return {
      status: 'success',
      message: 'Playlist song berhasil dihapus',
    };
  }

  async getActivitiesHandler(request, h) {
    const { id: playlistId } = request.params;
    const { id: userId } = request.auth.credentials;

    let statusCode = 200;
    let responseData = {};

    const playlistExists = await this._playlistsService.playlistExists(playlistId);
    if (!playlistExists) {
      statusCode = 404;
      responseData = {
        status: 'fail',
        message: 'Playlist not found',
      };
    } else {
      try {
        await this._playlistsService.verifyPlaylistAccessForActivity(playlistId, userId);
        const activities = await this._collaborationsService.getCollaborationActivities(playlistId);

        responseData = {
          status: 'success',
          data: {
            playlistId,
            activities,
          },
        };
      } catch (error) {
        if (error instanceof AuthorizationError) {
          statusCode = 403;
          responseData = {
            status: 'fail',
            message: 'You are not authorized to view activities for this playlist',
          };
        } else {
          throw error;
        }
      }
    }

    return h.response(responseData).code(statusCode);
  }

  async getPlaylistActivitiesByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(id, credentialId);

    const activities = await this._playlistsService.getPlaylistActivitiesById(
      id,
    );

    return {
      status: 'success',
      data: {
        playlistId: id,
        activities,
      },
    };
  }

  async getPlaylistsActivitiesHandler(request, h) {
    const { id: playlistId } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._playlistsService.verifyPlaylistAccess(playlistId, credentialId);
    const activities = await this._playlistsService.getPlaylistsActivities(playlistId);

    return h.response({
      status: 'success',
      data: {
        playlistId,
        activities,
      },
    });
  }
}

module.exports = PlaylistsHandler;
