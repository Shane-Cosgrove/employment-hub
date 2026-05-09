const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const JOB_PROTO = path.join(__dirname, "../protos/job.proto");

const packageDef = protoLoader.loadSync(JOB_PROTO, {
    keepCase: true,
    defaults: true,
});

const jobProto = grpc.loadPackageDefinition(packageDef).job;

const client = new jobProto.JobService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

client.RegisterJobSeeker(
    {
        job_seeker_id: "JS101",
        name: "Shane",
        skills: ["Customer Service", "Communication"],
    },
    (error, response) => {
        if (error) {
            console.error("RegisterJobSeeker error:", error.message);
            return;
        }

        console.log("RegisterJobSeeker:", response.message);

        client.PostJob(
            {
                job_id: "J20",
                title: "Sales Assistant",
                required_skills: ["Customer Service", "POS Systems"],
            },

            (error, response) => {
                if (error) {
                    console.error("PostJob error:", error.message);
                    return;
                }

                console.log("PostJob:", response.message);

                const call = client.FindMatches({
                    job_seeker_id: "JS101",
                });

                call.on("data", (response) => {
                    console.log("Match found:", response);
                });

                call.on("end", () => {
                    console.log("No more matches.");
                });

                call.on("error", (err) => {
                    console.error("FindMatches error:", err.message);
                });
            }
        );
    }
);