/**
 * This file is the one that actually plays a video.
 */
import {InitializeFairPlayStream} from "./FairPlay.js";

let PROTOCOL = "hls";
let DRM = "clear";
let PLAYER_TYPE = "hls-dash";
let player;

const SetErrorMessage = (message) => {
  document.getElementById("error-message").innerText = message;
};

const PlayerConfiguration = () => {
  try {
    const configuration = document.getElementById("player-configuration").value.trim();

    if(!configuration) { return {}; }

    return JSON.parse(configuration);
  } catch(error) {
    SetErrorMessage("Unable to parse player configuration");
    return {};
  }
};


/**
 * This function is unecessary. It is just used for their example of different protocols.
 */
// const UpdateButtons = () => {
//   [
//     "select-hls-dash",
//     "select-bitmovin",
//     "load-hls",
//     "load-hls-aes",
//     "load-hls-sample-aes",
//     "load-hls-fairplay",
//     "load-dash",
//     "load-dash-wv"
//   ].forEach(id => document.getElementById(id).className = "");

//   if(PLAYER_TYPE === "bitmovin") {
//     document.getElementById("select-bitmovin").className = "active";
//   } else {
//     document.getElementById("select-hls-dash").className = "active";
//   }

//   let activeOption;
//   if(PROTOCOL === "hls") {
//     if(DRM === "aes-128") {
//       activeOption = "load-hls-aes";
//     } else if(DRM === "sample-aes") {
//       activeOption = "load-hls-sample-aes";
//     } else if(DRM === "fairplay") {
//       activeOption = "load-hls-fairplay";
//     } else {
//       activeOption = "load-hls";
//     }
//   } else {
//     if(DRM === "widevine") {
//       activeOption = "load-dash-wv";
//     } else {
//       activeOption = "load-dash";
//     }
//   }

//   document.getElementById(activeOption).className = "active";
// };


/**
 * We can use this function and its sister, CreatePlayerElement, to create videos and display them. 
 * TODO: Modify this so that it works with multiple videos and doesn't rely on the global "player" variable
 */
const DestroyPlayer = () => {
  // Stop current player
  if(player) {
    player.unload ? player.unload() : (player.destroy ? player.destroy() : player.reset());
  }

  // Remove video element
  const existingElement = document.getElementById("video-element");
  if(existingElement) {
    document.body.removeChild(existingElement);
  }

  document.getElementById("bitrate").innerHTML = "";
};

const CreatePlayerElement = () => {
  DestroyPlayer();

  let playerElement;
  if(PLAYER_TYPE === "bitmovin") {
    // Bitmovin is attached to a 'div' element, not a 'video' element
    playerElement = document.createElement("div");
  } else {
    playerElement = document.createElement("video");
    playerElement.controls = true;
    playerElement.autoplay = true;
  }

  playerElement.id = "video-element";

  document.body.prepend(playerElement);

  return playerElement
};

/**
 * This function is only for HlsJs protocol
 */

const LoadHlsJs = (playoutOptions) => {
    /**
     * This first part of the function appears to simply check that the playout method which is picked is valid.
     */
  const playoutMethods = playoutOptions.hls.playoutMethods;

  let playoutInfo;
  if(DRM === "aes-128") {
    playoutInfo = playoutMethods["aes-128"];
  } else if(DRM === "sample-aes") {
    playoutInfo = playoutMethods["sample-aes"];
  } else {
    playoutInfo = playoutMethods.clear;
  }

  if(!playoutInfo) {
    SetErrorMessage(`HLS ${DRM} playout not supported for this content`);
    return;
  }

  /**
   * The second part of this function creates a player element and sets its video source
   */
  const playerElement = CreatePlayerElement();

  // Use native player for Sample AES and FairPlay
  if(DRM === "sample-aes" && PLAYER_TYPE !== "bitmovin") {
    playerElement.src = playoutInfo.playoutUrl;
    return;
  } else if(DRM === "fairplay" && PLAYER_TYPE !== "bitmovin") {
    InitializeFairPlayStream({playoutOptions, video: playerElement});
    return;
  }

  /**
   * The last part of this function may be unecessary for us. It looks like it's only needed if we don't use Sample AES or Fairplay,
   * which we should probably use to keep it simple.
   */
  player = new Hls(PlayerConfiguration());
  player.loadSource(playoutInfo.playoutUrl);
  player.attachMedia(playerElement);

  player.on(Hls.Events.LEVEL_SWITCHED, () => {
    const currentLevel = player.levels[player.currentLevel];

    document.getElementById("bitrate").innerHTML = `${currentLevel.attrs.RESOLUTION} | ${currentLevel.bitrate / 1000 / 1000} Mbps`;
  });
};

/**
 * This function is only for Dash protocol
 */
const LoadDash = (playoutOptions) => {
  const playoutMethods = playoutOptions.dash.playoutMethods;

  let playoutInfo, licenseServer;
  if(DRM === "widevine") {
    playoutInfo = playoutMethods.widevine;

    if(playoutInfo) {
      licenseServer = playoutMethods.widevine.drms.widevine.licenseServers[0];
    }
  } else {
    // Play clear
    playoutInfo = playoutMethods.clear;
  }

  if(!playoutInfo) {
    SetErrorMessage(`Dash ${DRM} playout not supported for this content`);
    return;
  }

  const playerElement = CreatePlayerElement();
  player = dashjs.MediaPlayer().create();
  player.setProtectionData({
    "com.widevine.alpha": {
      "serverURL": licenseServer
    }
  });

  player.initialize(playerElement, playoutInfo.playoutUrl);

  player.updateSettings(PlayerConfiguration());

  player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, () => {
    const currentLevel = player.getBitrateInfoListFor("video")[player.getQualityFor("video")];

    document.getElementById("bitrate").innerHTML = `${currentLevel.width}x${currentLevel.height} | ${currentLevel.bitrate / 1000 / 1000} Mbps`;
  });
};

const LoadBitmovin = (playoutOptions) => {
  const playerElement = CreatePlayerElement();

  const config = {
    key: "532a4784-591a-4039-8497-5feb80e5dd66",
    playback: {
      autoplay: true
    },
    events: {
      [bitmovin.player.PlayerEvent.VideoPlaybackQualityChanged]: ({targetQuality}) => {
        document.getElementById("bitrate").innerHTML =
          `${targetQuality.width}x${targetQuality.height} | ${targetQuality.bitrate / 1000 / 1000} Mbps`;
      }
    },
    ...PlayerConfiguration()
  };

  player = new bitmovin.player.Player(playerElement, config);

  player.load(playoutOptions).catch(
    (error) => {
      DestroyPlayer();
      if(error.name === "SOURCE_NO_SUPPORTED_TECHNOLOGY") {
        SetErrorMessage(`${PROTOCOL} ${DRM} playout not supported for this content`);
      } else {
        SetErrorMessage(`Bitmovin error: ${error.name}`);
        console.error(error);
      }
    }
  );
};


/**
 * This function loads a video using the private key and object id or version hash. 
 * TODO: Make this work with a passed in private key and object id, rather than reading from DOM.
 */
const Load = async () => {
  SetErrorMessage("");

  try {
    const contentId = document.getElementById("content-id").value;

    if(!contentId) { return; }

    const objectId = contentId.startsWith("iq__") ? contentId : "";
    const versionHash = contentId.startsWith("hq__") ? contentId : "";

    const client = await ElvClient.FromConfigurationUrl({
      configUrl: document.getElementById("config-url").value
    });

    const privateKey = document.getElementById("private-key").value;
    if(privateKey) {
      const wallet = client.GenerateWallet();
      const signer = wallet.AddAccount({privateKey});
      client.SetSigner({signer});
    } else {
      await client.SetStaticToken({
        token: client.utils.B64(JSON.stringify({qspace_id: await client.ContentSpaceId()}))
      });
    }

    let playoutOptions;
    if(PLAYER_TYPE === "bitmovin") {
      playoutOptions = await client.BitmovinPlayoutOptions({
        objectId,
        versionHash,
        protocols: [PROTOCOL],
        drms: [DRM]
      });

      LoadBitmovin(playoutOptions);
    } else {
      playoutOptions = await client.PlayoutOptions({
        objectId,
        versionHash,
        protocols: [PROTOCOL],
        drms: [DRM]
      });

      if(PROTOCOL === "hls") {
        LoadHlsJs(playoutOptions);
      } else {
        LoadDash(playoutOptions);
      }
    }
  } catch(error) {
    SetErrorMessage(error.message ? error.message : error);
    console.error(error);
  }
};

const SetOptions = (protocol, drm) => {
  PROTOCOL = protocol;
  DRM = drm || "";

  UpdateButtons();
};


/**
 * This function appears to just configure the player based on which protocol we're using.
 */
const SetPlayer = (playerType) => {
  PLAYER_TYPE = playerType;

  if(playerType === "bitmovin") {
    document.getElementById("player-configuration").value = JSON.stringify({
      "live": {
        "lowLatency": {
          "targetLatency": 7,
          "catchup": {
            "playbackRateThreshold": 0.075,
            "seekThreshold": 5,
            "playbackRate": 1.2
          },
          "fallback": {
            "playbackRateThreshold": 0.075,
            "seekThreshold": 5,
            "playbackRate": 0.95
          }
        }
      }
    }, null, 2);
  } else {
    document.getElementById("player-configuration").value = "{}";
  }

  UpdateButtons();
};

/**
 * Everything else that's here should be unecessary.
 */
document.getElementById("select-hls-dash").onclick = () => SetPlayer("hls-dash");
document.getElementById("select-bitmovin").onclick = () => SetPlayer("bitmovin");

document.getElementById("load-hls").onclick = () => SetOptions("hls", "clear");
document.getElementById("load-hls-aes").onclick = () => SetOptions("hls", "aes-128");
document.getElementById("load-hls-sample-aes").onclick = () => SetOptions("hls", "sample-aes");
document.getElementById("load-hls-fairplay").onclick = () => SetOptions("hls", "fairplay");
document.getElementById("load-dash").onclick = () => SetOptions("dash", "clear");
document.getElementById("load-dash-wv").onclick = () => SetOptions("dash", "widevine");

document.getElementById("load-button").onclick = () => Load();

UpdateButtons();