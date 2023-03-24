const path = require("path");
const sharp = require("sharp");
const fs = require('fs')
let date;
let time;
setInterval(() => {
    date = new Date
    time = date.getMinutes() + ":" + date.getSeconds()
}, 1000);


//This function is being called inside worker handler
//the value of job is the properties added when 
//addJob() function was called

function processUploadedImages(job) {
    try {
        // let counter = 0;
        // for (let i = 0; i < 1000000000; i++) {
        //     counter++;
        // };
        //The data added to the queue was stringified,
        //Sharp needs buffer data not string
        const imageFileData = Buffer.from(job.image.data, "base64");
        //Remove extension from image name
        const imageName = path.parse(job.image.name).name;
        const folderName = job.image.folderName

        if (!fs.existsSync(`./public/images/${folderName}`)) {
            throw new Error(folderName + " doesent exist")
        }
        console.log(`${time} -- sharp processing starting for ${imageName}`);
        //Sharp function for image processing
        const processImage = async (size) =>
            await sharp(imageFileData)
                .webp({ quality: 90 })
                .toFile(`./public/images/${folderName}/${imageName}.webp`);
        processImage()
    } catch (error) {
        console.log(error);
    }

}
module.exports = { processUploadedImages };