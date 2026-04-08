import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema({
  position: { type: Number, required: true, min: 0, max: 4 },
  filename: { type: String, required: true },
  prompt: { type: String, default: null },
  prompt_answer: { type: String, default: null },
}, { _id: false });

const FilterSchema = new mongoose.Schema({
  school: { type: String, default: null },
  school_dealbreaker: { type: Boolean, default: false },
  age_min: { type: Number, default: null },
  age_max: { type: Number, default: null },
  age_dealbreaker: { type: Boolean, default: false },
  majors: { type: [String], default: [] },
  majors_dealbreaker: { type: Boolean, default: false },
  year: { type: String, default: null },
  year_dealbreaker: { type: Boolean, default: false },
  gender: { type: String, default: null },
  gender_dealbreaker: { type: Boolean, default: false },
  races: { type: [String], default: [] },
  races_dealbreaker: { type: Boolean, default: false },
  distance_miles: { type: Number, default: 50 },
  distance_dealbreaker: { type: Boolean, default: false },
}, { _id: false });

const UserSchema = new mongoose.Schema({
  netid:              { type: String, required: true, unique: true },
  email:              { type: String, required: true, unique: true, lowercase: true },
  password_hash:      { type: String, default: null },
  phone_number:       { type: String, sparse: true, unique: true },  // No default - let it be undefined
  first_name:         { type: String, default: null },
  last_name:          { type: String, default: null },
  name:               { type: String, default: null }, // Keep for backwards compat
  age:                { type: Number, default: null },
  school:             { type: String, default: null },
  year:               { type: String, default: null },
  majors:             { type: [String], default: [] },
  minors:             { type: [String], default: [] },
  major:              { type: String, default: null }, // Keep for backwards compat
  gender:             { type: String, default: null },
  sexuality:          { type: String, default: null },
  looking_for:        { type: String, default: null },
  height:             { type: String, default: null },
  location:           { type: String, default: null },
  job:                { type: String, default: null },
  religion:           { type: String, default: null },
  personality_answer: { type: String, default: null },
  favorite_cuisine:   { type: String, default: null },
  favorite_cuisines:  { type: [String], default: [] },
  race_ethnicities:   { type: [String], default: [] },
  alcohol_use:        { type: String, default: null },
  weed_use:           { type: String, default: null },
  drug_use:           { type: String, default: null },
  photos:             { type: [PhotoSchema], default: [] },
  filters:            { type: FilterSchema, default: {} },
  subscription_tier:  { type: String, enum: ['free', 'premium', 'plus'], default: 'free' },
  daily_like_limit_override: { type: Number, default: null },
  like_boost_until:   { type: Date, default: null },
  likes_remaining:    { type: Number, default: 10 },
  last_like_reset:    { type: Date, default: Date.now },
  // Account settings
  hidden:             { type: Boolean, default: false },
  account_status:     { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  role:               { type: String, enum: ['user', 'admin'], default: 'user' },
  show_age:           { type: Boolean, default: true },
  show_school:        { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
