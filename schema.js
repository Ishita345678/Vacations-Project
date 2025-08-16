const Joi = require("joi");

// Validation schema for listings
const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().min(1).required(),
    description: Joi.string().min(1).required(),
    price: Joi.number().min(0).required(),
    location: Joi.string().min(1).required(),
    country: Joi.string().min(1).required(),
    image: Joi.string().uri().allow(null, ""),
  }).required(),
});

// Validation schema for reviews
const reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().min(1).required(),
  }).required(),
});

module.exports = { listingSchema, reviewSchema };



