const InvariantError = require('../../exceptions/InvariantError');
const { UserPayloadSchema } = require('./schema');

const UsersValidator = {
  validateUserPayload: (payload) => {
    const validationResult = UserPayloadSchema.validate(payload, { abortEarly: false });

    if (validationResult.error) {
      throw new InvariantError(validationResult.error.details.map((detail) => detail.message).join(', '));
    }
  },
};

module.exports = UsersValidator;
