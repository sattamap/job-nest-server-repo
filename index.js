const express = require('express');
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
const port = process.env.PORT || 5000;
const jwtSecret = process.env.ACCESS_TOKEN_SECRET


//middleware 'https://job-nest-94803.web.app',

app.use(cors({
    origin: [
        'http://localhost:5173', 'https://job-nest-94803.web.app'
    ],
    credentials:true
}));
app.use(express.json());
app.use(cookieParser());



//middlewre

const logger = (req,res, next) =>{
    console.log('log info:',req.method, req.url);
    next();
}

const verifyToken = (req, res, next) =>{
    const token = req?.cookies?.token;
   console.log('token in the middleware:', token);
  
    if(!token){
        return res.status(401).send({message: "Unauthorized Access"})
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
       if(err){
        return res.status(401).send({message: 'Unauthorized access'})
       } 
       console.log("decoded:",decoded);
       req.user = decoded;
       next();
      
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4rcq2hm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




const dbConnect = async () =>{
    try{
        client.connect()
        console.log('DB connected Successfully');
    }catch(error){
        console.log(error.name,error.message);
    }
}

dbConnect()




        const jobsCollection = client.db('JobNestDB').collection('jobs');
        const appliedJobsCollection = client.db('JobNestDB').collection('appliedJobs');

        app.get('/', (req, res) => {
            res.send('job-nest-server is running')
        })
        
        //JWT token generation and cookie setting

        app.post('/jwt', async(req,res)=>{
            const user = req.body;
            console.log("user for token", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {expiresIn: '1h'})
            res.cookie(
                "token",
                token,
                {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production" ? true: false,
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                }
            )
           .send({success:true});
       
           
        })
        
        //user logout and clear JWT cookie

        app.post('/logout', async(req,res)=>{
            const user = req.body;
            console.log("log out", user);
            res.clearCookie('token', {
                maxAge: 0,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
              })
              .send({ success: true })
        })

   
        //API endpoint for retrieving all jobs  
        app.get('/jobs',async (req, res) => {
        
            const cursor = jobsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })
        //API endpoint for retrieving applied jobs
        app.get('/appliedJobs',logger,verifyToken,  async (req, res) => {
            console.log(req.query.email);
            console.log('Token owner applied is:',req.user);
            if(req.user.email !==req.query.email){
                return res.status(403).send({message: 'Forbidden access'})
            }
            const cursor = appliedJobsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // API endpoint for retrieving a single job by ID

        app.get('/jobs/:id', async (req, res) => {

        
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await jobsCollection.findOne(query);
            res.send(result);
        })

        //API for job  creating a new job

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            //newJob.jobApplicantsNumber = 0; // Initialize the applicants field
            newJob.jobApplicantsNumber = parseInt(newJob.jobApplicantsNumber, 10);
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
        });

        //job applicant count and inserted application data in /appliedJobs API

        app.post('/appliedJobs',async (req, res) => {
            const applicationData = req.body;

            // Update the job's applicant count using the $inc operator
            const jobId = applicationData.jobId;
            // Convert the jobId to ObjectId
            const jobObjectId = new ObjectId(jobId);

            // Update the job's applicant count by incrementing it by 1
            await jobsCollection.updateOne(
                { _id: jobObjectId },
                { $inc: { jobApplicantsNumber: 1 } }
            );

            const result = await appliedJobsCollection.insertOne(applicationData);

            res.send(result);
        });

        // API endpoint for updating a job by ID

        app.put('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            const jobs = req.body;
            console.log('new user', id, jobs);
            jobs.jobApplicantsNumber = parseInt(jobs.jobApplicantsNumber, 10);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedJob = {
                $set: {
                    jobBannerURL: jobs.jobBannerURL,
                    jobTitle: jobs.jobTitle,
                    loggedInUserName: jobs.loggedInUserName,
                    jobCategory: jobs.jobCategory,
                    salaryRange: jobs.salaryRange,
                    jobDescription: jobs.jobDescription,
                    jobPostingDate: jobs.jobPostingDate,
                    applicationDeadline: jobs.applicationDeadline,
                    jobApplicantsNumber: jobs.jobApplicantsNumber,
                    userEmail: jobs.userEmail,

                }
            }

            const result = await jobsCollection.updateOne(filter, updatedJob, options)
            res.send(result);
        });

        //API endpoint for deleting a job by ID

        app.delete('/jobs/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Delete from database:', id);
            const query = { _id: new ObjectId(id) }

            const result = await jobsCollection.deleteOne(query);
            res.send(result);
        })










app.listen(port, () => {
    console.log(`job-nest-server is running on post: ${port}`);
})
