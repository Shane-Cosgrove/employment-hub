const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const SKILLS_PROTO = path.join(__dirname, "../protos/skills.proto");

const packageDef = protoLoader.loadSync(SKILLS_PROTO, {
  keepCase: true,
  defaults: true,
});

const skillsProto = grpc.loadPackageDefinition(packageDef).skills;

const client = new skillsProto.SkillsService(
    "localhost:50053",
    grpc.credentials.createInsecure()
);

//Step 1 - analyse skill gap
client.AnalyzeSkillGap(
    {
        job_seeker_id: "JS101",
        target_job_id: "J20",
        current_skills: ["Customer Service", "Communication"],
        required_skills: ["Customer Service", "POS Systems", "Teamwork"],
    },
    (error, response) => {
        if (error) {
            console.error("Error analyzing skill gap:", error.message);
        return;
    }

    console.log("AnalyzeSkillGap:", response);

    //Step 2: recommend training based on the missing skills
    client.RecommendTraining(
        {
            missing_skills: response.missing_skills,
        },
        (error, response) => {
            if (error) {
                console.error("RecommendTraining error:", error.message);
                return;
            }

            console.log("RecommendTraining:", response);
        }
    );
}
);