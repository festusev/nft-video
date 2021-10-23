import uploadToEluvio from "./eluvio.js"

export default function uploadFile(event) {
    let file = event.target.files[0];
    var reader = new FileReader();
 
    reader.onload = function() {

    var arrayBuffer = new Uint8Array(reader.result);
    console.log(arrayBuffer);
    };
    let array = reader.readAsArrayBuffer(file);
    console.log(array);
    
    uploadToEluvio(array);
}