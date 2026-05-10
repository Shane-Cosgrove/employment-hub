const express = require("express");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function loadProto(protoFile, packageName) {
    const packageDef = protoLoader.loadSync(
        path.join(__dirname, "../protos", protoFile),
        {
            keepCase: true,
            defaults: true,
        }
    );

    return grpc.loadPackageDefinition(packageDef)[packageName]
}

const jobProto = loadProto("job.proto", "job");
const interviewProto = loadProto("interview.proto", "interview");
const skillsProto = loadProto("skills.proto", "skills");

const jobClient = new jobProto.JobService(
    "localhost:50051",
    grpc.credentials.createInsecure()
);

const interviewClient = new interviewProto.InterviewService(
    "localhost:50052",
    grpc.credentials.createInsecure()
);

const skillsClient = new skillsProto.SkillsService(
    "localhost:50053",
    grpc.credentials.createInsecure()
);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/test-job", (req, res) => {
    jobClient.RegisterJobSeeker(
        {
            job_seeker_id: "JS101",
            name: "Shane",
            skills: ["Customer Service", "Communication"],
        },
        (error, response) => {
            if (error) return res.json({ error: error.message });

            jobClient.PostJob(
                {
                    job_id: "J20",
                    title: "Customer Service Representative",
                    description: "Handle customer inquiries and provide support.",
                    required_skills: ["Customer Service", "Communication"],
                },

                (error) => {
                    if (error) return res.json({ error: error.message });

                    const matches = [];
                    const call = jobClient.FindMatches({ job_seeker_id: "JS101" });

                    call.on("data",(match) => matches.push(match));
                    call.on("end", () => res.json({ message: response.message, matches}));
                    call.on("error", (err) => res.json({ error: err.message }));
                }
            );
        }
    );
});

app.get("/test-interview", (req, res) => {
    interviewClient.CreateInterviewSlot(
        {
            slot_id: "S101",
            employer_id: "EMP01",
            date_time: "2026-02-02 10:00",
        },
        (error, slotResponse) => {
            if (error) return res.json({ error: error.message });

            interviewClient.BookInterview(
                {
                    slot_id: "S101",
                    candidate_id: "JS101",
                },
                (error, bookingResponse) => {
                    if (error) return res.json({ error: error.message });

                    interviewClient.GetInterviewStatus(
                        {
                            booking_id: bookingResponse.booking_id,
                        },
                        (error, statusResponse) => {
                            if (error) return res.json({ error: error.message });

                            res.json({
                                slot: slotResponse.message,
                                booking: bookingResponse,
                                status:statusResponse,
                            });
                        }
                    );
                }
            );
        }
    );
});

app.get("/test-skills", (req, res) => {
    skillsClient.AnalyzeSkillGap(
        {
            job_seeker_id: "JS101",
            target_job_id: "J20",
            current_skills: ["Customer Service", "Communication"],
            required_skills: ["Customer Service", "POS Systems", "Teamwork"],
        },
        (error, gapResponse) => {
            if (error) return res.json({ error: error.message });

            skillsClient.RecommendTraining(
                {
                    missing_skills:gapResponse.missing_skills,
                },
                (error, trainingResponse) => {
                    if(error) return res.json({ error: error.message });

                    res.json({
                        skill_gap: gapResponse,
                        training: trainingResponse,
                    });
                }
            );
        }
    );
});

app.listen(PORT, () => {
    console.log(`GUI running at http://localhost:${PORT}`);
});