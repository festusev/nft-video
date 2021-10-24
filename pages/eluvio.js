// https://github.com/eluv-io/elv-client-js


// Code for streaming video from the fabric: https://github.com/eluv-io/elv-stream-sample

// From source
import { ElvClient } from "@eluvio/elv-client-js";

export default async function uploadToEluvio(arrayBuffer) {
    // NOTE: THIS IS THE DEMO NET, NOT the main net
    const client = await ElvClient.FromConfigurationUrl({
        configUrl: "https://demov3.net955310.contentfabric.io/config"
    });


    // About the code below:
    // Note: Always treat private keys (and mnemonics) as private, sensitive user data. 
    // Always store and transfer them encrypted (the client has a method for encrypting private keys with a password - 
    // see ElvWallet#GenerateEncryptedPrivateKey). A plaintext private key or mnemonic should never leave the user's browser - 
    // all use of the private key is done on the client.
    const wallet = client.GenerateWallet();
    const signer = wallet.AddAccount({
        privateKey: "0x0000000000000000000000000000000000000000000000000000000000000000"
    });

    client.SetSigner({signer});


    // Creating content code:
    const createResponse = await client.CreateContentObject({libraryId});
    const objectId = createResponse.id;
    const writeToken = createResponse.write_token;

    await client.ReplaceMetadata({
    libraryId,
    objectId,
    writeToken,
    metadata: {
        tags: [
        "video",
        "audio"
        ]
    }
    });

    await client.UploadFiles({
    libraryId,
    objectId,
    writeToken,
    fileInfo: [
        {
        path: "image.jpg",
        mime_type: "image/jpeg",
        size: 10000,
        data: arrayBuffer
        }
    ]
    });

    const finalizeResponse = await client.FinalizeContentObject({
    libraryId,
    objectId,
    writeToken
    });

    const versionHash = finalizeResponse.hash;
}