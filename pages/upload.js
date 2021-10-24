function uploadFile() {
    console.log("uploading file");
    let file = document.getElementById("uploadVid").files[0];
    let reader = new FileReader();
  
    reader.onload = function(e) {
        let arrayBuffer = new Uint8Array(reader.result);
        console.log(arrayBuffer);
        uploadToEluvio(arrayBuffer);
    }
  
    reader.readAsArrayBuffer(file)
    
}

async function uploadToEluvio(arrayBuffer) {
    // NOTE: THIS IS THE DEMO NET, NOT the main net
    const client = await ElvClient.FromConfigurationUrl({
        configUrl: "https://demov3.net955210.contentfabric.io/config"
    });


    // About the code below:
    // Note: Always treat private keys (and mnemonics) as private, sensitive user data. 
    // Always store and transfer them encrypted (the client has a method for encrypting private keys with a password - 
    // see ElvWallet#GenerateEncryptedPrivateKey). A plaintext private key or mnemonic should never leave the user's browser - 
    // all use of the private key is done on the client.
    const wallet = client.GenerateWallet();
    const signer = wallet.AddAccount({
        privateKey: ""
    });

    client.SetSigner({signer});

    console.log("Library id");
    let libraryId = "ilibVtQyvSaiKqyUjfPArSyhSe2Q51S"

    // Creating content code:
    const createResponse = await client.CreateContentObject({libraryId});
    const objectId = createResponse.id;
    const writeToken = createResponse.write_token;

    console.log("Created response");

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
    
    console.log("Replaced metadata");

    await client.UploadFiles({
    libraryId,
    objectId,
    writeToken,
    fileInfo: [
        {
        path: "video.mp4",
        mime_type: "video/mp4",
        size: arrayBuffer.length,
        data: arrayBuffer
        }
    ]
    });
    console.log("Uploaded file");

    const finalizeResponse = await client.FinalizeContentObject({
    libraryId,
    objectId,
    writeToken
    });

    const versionHash = finalizeResponse.hash;

    console.log("Version hash:")
    console.log(versionHash);

    document.getElementById("content-id").value = versionHash;

    Load();
}