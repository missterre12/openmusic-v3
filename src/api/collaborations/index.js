/* eslint-disable function-paren-newline */
/* eslint-disable max-len */
/* eslint-disable object-curly-newline */
const CollaborationsHandler = require('./handler');
const routes = require('./routes');

module.exports = {
  name: 'collaborations',
  version: '1.0.0',
  register: async (server, { collaborationsService, playlistsService, usersService, validator }) => {
    const collaborationsHandler = new CollaborationsHandler(
      collaborationsService, playlistsService, usersService, validator);
    server.route(routes(collaborationsHandler));
  },
};
