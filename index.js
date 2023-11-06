const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()


const app = express();
const port = process.env.PORT || 5000;


//middleware

app.use(cors());
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

          //job related API
          app.get('/jobs', async (req, res) => {
            const cursor = jobsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
            })


        //   app.post('/jobs', async (req, res) => {
        //         const newJob = req.body;
               
        //         const result = await jobsCollection.insertOne(newJob);
        
        //         res.send(result);
        
        //     })

        app.post('/jobs', async (req, res) => {
            const newJob = req.body;
            newJob.jobApplicantsNumber = 0; // Initialize the applicants field
            const result = await jobsCollection.insertOne(newJob);
            res.send(result);
          });


        //   app.post('/appliedJobs', async (req, res) => {
        //         const applicationData = req.body;
        //         console.log(applicationData);
        //         const result = await appliedJobsCollection.insertOne(applicationData);
        
        //         res.send(result);
        
        //     })


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

          app.delete('/jobs/:id',async(req,res)=>{
            const id = req.params.id;
            console.log('Delete from database:',id);
            const query = {_id: new ObjectId(id)}
        
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
