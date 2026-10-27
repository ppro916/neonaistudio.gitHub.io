/**
 * Site-wide constants. Edit here.
 * @module config
 */

/**
 * TODO(owner): confirm the official "Ai Nexus" YouTube channel URL, e.g. "https://www.youtube.com/@yourhandle".
 * While empty, the YouTube card links to the showreel video instead.
 */
export const YOUTUBE_URL = "";

export const WA_NUMBER = "919226520552";
export const SHOWREEL_ID = "XQsW4P6z_So";
export const BABYLON_URL = "https://cdn.babylonjs.com/v7.54.3/babylon.js";

/** Build a wa.me link with a prefilled message. @param {string} text */
export const waLink = (text) => "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(text);
