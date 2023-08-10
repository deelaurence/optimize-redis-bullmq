const fs = require("fs")
const sharp = require("sharp")
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
const path = require("path");


const singleImageUpload = async (req, res) => {
    try {
        return __awaiter(this, void 0, void 0, function* () {
            //Check if the frontend form sends image data data
            if (!req.files) {
                let message = "File Empty"
                return res.render("error", { message })
            }
            console.log(req.files);

            if (req.files) {
                const { image } = req.files;
                const { filename, fileheight, filewidth } = req.body
                const folderName = `public/results/images/${filename}`
                //pass the name inputed as the file name down
                let prop = encodeURIComponent(filename)
                //check if the file is an image
                if (!image.mimetype.includes("image")) {
                    let message = "Please Select An Image"
                    return res.render("error", { message })
                }
                //logic for conversion
                async function resizeImage() {
                    try {
                        //get info about the uploaded image
                        const { height, width, size } = await sharp(image.data).metadata()
                        //check if the image with the name exists on server
                        if (fs.existsSync("./public/unresized/" + filename + ".webp")) {
                            throw new Error('File name exists already')
                        }
                        //If user decides to manually input dimensions

                        if (fileheight || filewidth) {
                            //Check if BOTH width and height are provided
                            if (!fileheight || !filewidth) {
                                throw new Error('Values for both the Height and Width should be provided')
                            }
                            const metadata = await sharp(image.data).metadata()
                            await sharp(image.data)
                                .resize({
                                    width: Number(fileheight),
                                    height: Number(filewidth)
                                })
                                .toFile("./public/unresized/" + filename + ".webp")
                            //Query string allows me pass the information to the 
                            //controller I am res.redirecting to. This would make it
                            //Availavble on the clientside
                            const querystring = require('querystring')
                            const query = querystring.stringify({
                                "filenames": prop,
                                "size": size,
                                "width": filewidth,
                                "height": fileheight
                            })
                            //redirect to the next route and call the singleImageProcess
                            //controller
                            return res.redirect("/unresized?" + query)
                        }
                        //This block runs is meant to run if the user does not send
                        //the file height and size. it extracts the original picture
                        //dimension 
                        else {
                            //Check if the user did not send the file width or height 
                            //and do not click the checkbox to indicate maintaining 
                            //original dimensions
                            if (!fileheight && !filewidth & req.body.originalSize != "on") {
                                throw new Error("File Width and Height cannot be empty")
                            }
                            //extract original dimensions from meta data
                            const { height, width, size } = await sharp(image.data).metadata()
                            const metadata = await sharp(image.data).metadata()
                            //logic for conversion
                            await sharp(image.data)
                                .resize({
                                    width: width,
                                    height: height
                                })
                                .toFile("./public/unresized/" + filename + ".webp")

                        }
                         //This is the content of the query string if
                         //original dimensions is maintained
                        if (req.body.originalSize) {
                            const querystring = require('querystring')
                            const query = querystring.stringify({
                                "filenames": prop,
                                "size": size,
                                "width": width,
                                "height": height

                            })

                            return res.redirect("/unresized?" + query)
                        }

                    } catch (error) {
                        console.log(error.message);
                        const { message } = error
                        return res.render("error", { message })
                    }

                }
                resizeImage()

            }

        })
    } catch (error) {
        console.log(error.message);
        const { message } = error
        return res.render("error", { message })
    }
}

const processSingleImage = async (req, res) => {
    try {
        const uniqueFolder = req.query.filenames.trim();
        const { size, width, height } = req.query;
        const meta = await sharp(`./public/unresized/${uniqueFolder}.webp`).metadata()
        const imgDirPath = path.join(uniqueFolder);
        const imageSource = imgDirPath + ".webp"
        //Read the info of the file
        let info = fs.statSync(path.join("./public/unresized", imageSource))
        let newsize = info.size
        //Try to delete the file after some time for later consideration
        // setTimeout(() => {
        //     try {
        //         fs.rm(path.join("./public/unresized", imageSource), () => {
        //             console.log('deleted');
        //         })
        //     } catch (error) {
        //         console.log(error);
        //     }
        // }, 30000);
        res.render("unresized", { imageSource, width, height, size, newsize });
    } catch (error) {
        console.log(error.message);
        const { message } = error
        return res.render("error", { message })
    }
}

module.exports = { singleImageUpload, processSingleImage }