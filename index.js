const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000;


//middleware

app.use(cors({
    origin: [
        'http://localhost:5173'
    ],
    credentials:true
}));
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4rcq2hm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7) 
        await client.connect();

        const jobsCollection = client.db('JobNestDB').collection('jobs');
        const appliedJobsCollection = client.db('JobNestDB').collection('appliedJobs');
        
        //JWT token generation and cookie setting
        
        app.post('/jwt', async(req,res)=>{
            const user = req.body;
            console.log("user for token", user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET , {expiresIn: '1h'})
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite:'none'
            })
           .send({success:true});
           
        })


        app.post('/logout', async(req,res)=>{
            const user = req.body;
            console.log("log out", user);
            res.clearCookie('token',{maxAge: 0}).send({success: true})
        })

   
        //API endpoint for retrieving all jobs
        app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })
        //API endpoint for retrieving applied jobs
        app.get('/appliedJobs', async (req, res) => {
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

        app.post('/appliedJobs', async (req, res) => {
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



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('job-nest-server is running')
})

app.listen(port, () => {
    console.log(`job-nest-server is running on post: ${port}`);
})
