const { Worker } = require("bullmq");
require("dotenv").config();
const { processUploadedImages } = require("./utils");
//Step TWO in queing
//A worker handler Function takes parameter (job),
//job was added to the queue when the addJob() method was passed
//the job was in the waiting status 
//when the worker is started, job properties is presented here

const workerHandler = async (job) => {
    try {
        console.log(time + "--" + "Starting job:", job.data.image.name);
        processUploadedImages(job.data);
        return job.data.image.name;
    } catch (error) {
        console.error(error);
    }
};

const workerOptions = {
    connection: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        password: process.env.REDIS_PASSWORD,
    },

    // lockDuration: 9000000

};

let date;
let time;
setInterval(() => {
    date = new Date
    time = date.getMinutes() + ":" + date.getSeconds()
}, 1000);

//Worker instance created
const worker = new Worker("multipleImage", workerHandler, workerOptions);
worker.on('completed', (job, returnvalue) => {
    console.log(time + "--" + "completed " + returnvalue);
})
worker.on('failed', (job, error) => {
    console.log(error);
})
// worker.on('error', (error) => {
//     console.log(error);
// })
worker.on('error', err => {
    // log the error
    console.error(err);
});
console.log(time + "Worker started!");