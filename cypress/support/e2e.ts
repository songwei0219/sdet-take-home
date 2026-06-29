// Loaded before every spec file.
//
// NOTE TO CANDIDATE: there is a deliberately-missing piece of test isolation
// here. One of the specs depends on the API being in its seeded starting state.
// The API exposes POST /api/admin/reset for exactly this purpose. Part of the
// exercise is deciding where/whether to call it.

export {};
