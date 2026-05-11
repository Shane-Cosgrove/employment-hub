const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const JOB_PROTO = path.join(__dirname, "../protos/job.proto");

const packageDef = protoLoader.loadSync(JOB_PROTO, {
    keepCase: true,
    defaults: true,
})

const jobProto = grpc.loadPackageDefinition(packageDef).job;

const client = new jobProto.JobService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);      

//First register seekr 
client.RegisterJobSeeker( 
    {
        job_seeker_id: "JS101",
        name: "Shane",
        skills: ["Customer Service", "Communication", "Teamwork"],
    },
    (error, response) => {
        if (error) {
            console.error("RegisterJobSeeker error:", error.message);
            return;
        }

        console.log("RegisterJobSeeker:", response.message);

        //Lastly post a job
        client.PostJob(
            {
                job_id: "J99",
                title: "Customer Support Agent",
                required_skills: ["Customer Service", "Communication"],
            },
            (error, response) => {
                if (error && !error.message.includes("ALREADY_EXISTS")) {
                    console.error("PostJob error:", error.message);
                    return;
                }

                if (error) {
                    console.log("PostJob:", error.message);
                } else {
                    console.log("PostJob:", response.message);
                }

                //Bidirectional streaming RPC
                const call = client.LiveJobAlerts();

                call.on("data", (response) => {
                    console.log("LiveJobAlert:", response);
                });

                call.on("end", () => {
                    console.log("Live job alert stream ended.");
                });

                call.on("error", (error) => {
                    console.error("LiveJobAlerts error:", error.message);
                });

                call.write({
                    job_seeker_id: "JS101",
                    preferred_skill: "Customer Service",
                });

                call.write({
                    job_seeker_id: "JS101",
                    preferred_skill: "Communication",
                });

                call.write({
                    job_seeker_id: "JS101",
                    preferred_skill: "Leadership",
                });

                call.end();
            }
        );
    }
);

                
              