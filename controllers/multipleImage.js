const { createClient } = require('redis')
require("dotenv").config();
const client = createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
});
client.on("connect", () => {
    console.log("Connected to our redis instance!");
});
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
// Import queue, set host and port
const { Queue } = require("bullmq");
const redisOptions = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
};
const multipleImage = new Queue("multipleImage", {
    connection: redisOptions,
});
let statusMessage;
const form2 = (req, res) => {
    res.render("gallery", { statusMessage });
}
const form2Status = (req, res) => {
    res.json({ status: statusMessage });
}



//The function that would be called when the multiple image upload 
//route is hit
async function addJob(job) {
    await multipleImage.add(job.type, job, { removeOnComplete: 5, removeOnFail: 5 });
}

//creating time stamps for logs
let date;
let time;
setInterval(() => {
    date = new Date
    time = date.getMinutes() + ":" + date.getSeconds()
}, 1000);


const multipleImageUpload = async (req, res) => {
    //This is the logic that processes uploaded files
    statusMessage = 'no'
    setTimeout(() => {
        statusMessage = 'yes'
    }, 30000);
    try {

        // Check for null input
        if (!req.files) {
            let message = "Please select some images"
            statusMessage = "yes"
            return res.render("error", { message })
        }
        //Check if user uploads any file that is not an image
        req.files.image.forEach((image) => {
            if (!image.mimetype.includes("image")) {
                let message = "Please Select Only Images"
                statusMessage = "yes"
                return res.render("error", { message })
            }
        })
        //Check if user selects less than two images
        if (!req.files.image[0]) {
            throw new Error("Select more than one Image")
        }
        //Extract an almost unique hash values from the first image in the array
        //To save it as the folder name

        const folderName = req.files.image[0].md5

        //Remove directory if already exists
        const directory = `./public/images/${folderName}`
        if (fs.existsSync(directory)) {
            fs.rmdirSync(directory, { recursive: true })
            console.log("removed " + directory);
        }

        //Make a new directory with the folder name
        const newDir = fs.mkdir(path.join(`./public/images/${folderName}`), (err) => {
            try {
                if (err) {
                    fs.rmSync(path.join(`./public/images/${folderName}`), { recursive: true, force: true });
                    throw new Error("Couldnt make directory");
                }
                console.log(time + "--directory created")
                //For each image in the array, Add to the queue
                //with the addJob() method
                req.files.image.forEach(async (image) => {
                    try {
                        //QUEUE STEP ONE:
                        //[A] Add the stringified image data (image.data) to
                        //to the job queue
                        //[B] Add the images name and the folder name as well
                        //This is important to point the worker into the directory to place
                        //the processed image
                        await addJob({
                            type: "multipleImage",
                            image: {
                                name: image.name,
                                folderName,
                                data: Buffer.from(image.data).toString("base64"),
                            },

                        });
                        console.log(`Added ${image.name} to the queue`);

                    } catch (error) {
                        console.log(error);
                        statusMessage = "yes"
                        return res.render("error", { message })

                    }


                });

            } catch (error) {
                console.error(error)
            }
        });
        // return
        console.log(time + "--" + "Image Added to queue, preparing query string");
        //pass the folder name to the next controller
        //pass the length of the image uploaded to the next controller
        const querystring = require('querystring')
        const query = querystring.stringify({
            "foldername": folderName,
            "imagesLength": req.files.image.length
        })
        return res.redirect("/download?" + query);
    } catch (error) {
        console.log(time + "--" + error.message);
        const { message } = error
        if (message.length > 45) {

            statusMessage = "yes"
            return res.render("error", { message: "Something went very wrong, Try again with new set of pictures" })
        }
        statusMessage = "yes"
        return res.render("error", { message })
    }
}


const multipleImageDownload = async (req, res) => {
    console.log(time + "--" + "Ran line 1 of multipleImageDownload");
    try {
        const { foldername, imagesLength } = req.query

        const imgDirPath = path.join(__dirname, `../public/images/${foldername}`);

        if (!imgDirPath) {
            throw new Error('Directory not created yet, Try again')
        }

        let imgFiles;
        console.log(time + "--" + 'line 76 ran inside multiple image download');
        //Wait for all images to be processed before zipping
        let fullyprocessed = false;
        const intervalId = setInterval(() => {
            //Read the image names inside the created folder and return an object that
            //is required to create the zipped folder
            //path: where to look for the image to zip
            //name: the name of the the new image
            try {
                imgFiles = fs.readdirSync(imgDirPath).map((image) => {
                    return {
                        path: `./public/images/${foldername}/${image}`,
                        name: image
                    }
                });
                console.log(time + "--" + imgFiles, fullyprocessed);

                //imgFiles is an array of objects
                //fs.stat is called for each image in the array to check
                //if none of the images are 0bytes i.e unprocessed before zipping
                imgFiles.forEach((image, index) => {
                    fs.stat(image.path, async (err, stats) => {
                        if (err) {
                            console.log(time + "--" + err.message)
                        } else {
                            console.log(time + "--" + stats.size)
                            if (stats.size == 0) {
                                console.log(time + "--" + index + " not fully processed");
                            }
                            //imagesLength gotten from the query string is 
                            //the length of the array of images the user uploaded 
                            //imagesLength-1==index returns true if all images are fully processed 
                            if (stats.size > 0 && imagesLength - 1 == index) {
                                console.log(time + "--" + 0 + " fully processed");
                                console.log(imgFiles.length, index)
                                fullyprocessed = true
                                return
                            }
                        }
                    })
                })
            } catch (error) {
                console.error(error)
            }

        }, 3000);
        const interval2Id = setInterval(async () => {
            console.log(time + "--" + fullyprocessed, imgFiles);
            if (fullyprocessed) {
                console.log(time + "--" + "zipping already");
                clearInterval(intervalId);
                console.log(time + "--" + "Cleared interval one");
                await res.zip(imgFiles);
                statusMessage = 'yes'
                clearInterval(interval2Id)
                console.log(time + "--" + "Cleared interval two");
                //Delete folder after some time (30 minutes)
                setTimeout(async () => {
                    fs.rmSync(imgDirPath, { recursive: true, force: true });
                    console.log("Deleted " + imgDirPath);
                }, 1800000);
            }
        }, 5000);

        //pass the array of object into the zip function.  
    } catch (error) {
        console.log(time + "--" + error);

        return res.render('error', { message: error.message })
    }
}



module.exports = { multipleImageDownload, multipleImageUpload, form2, form2Status, multipleImage }