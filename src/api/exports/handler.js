const autoBind = require('auto-bind');

class ExportsHandler {
  constructor(service, validator, playlistsService) {
    this._service = service;
    this._validator = validator;
    this._playlistsService = playlistsService;

    autoBind(this);
  }

  async postExportPlaylistsHandler(request, h) {
    this._validator.validateExportPlaylistsPayload(request.payload);

    const { playlistId } = request.params;
    const { id: owner } = request.auth.credentials;

    const message = {
      playlistId,
      userId: owner,
      targetEmail: request.payload.targetEmail,
    };

    await this._playlistsService.verifyPlaylistOwner(playlistId, owner);
    await this._service.sendMessage('export:playlists', JSON.stringify(message));

    const response = h.response({
      status: 'success',
      message: 'Permintaan Anda dalam antrian',
    });
    response.code(201);
    return response;
  }
}

module.exports = ExportsHandler;
