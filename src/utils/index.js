/* eslint-disable camelcase */
const mapDBToModelAlbum = ({ id, name, year }) => ({
  id,
  name,
  year,
});

const mapDBToModelSong = (
  {
    id, title, year, performer, genre, duration, album_id,
  },
) => ({
  id,
  title,
  year,
  performer,
  genre,
  duration,
  albumId: album_id,
});

const mapDBToModelPlaylists = ({ id, name, username }) => ({
  id,
  name,
  username,
});

module.exports = {
  mapDBToModelAlbum,
  mapDBToModelSong,
  mapDBToModelPlaylists,
};
