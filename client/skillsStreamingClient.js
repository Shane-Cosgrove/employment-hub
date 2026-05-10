const grpc = require("@grpc/grpc-js");
const protoLoader = require ("@grpc/proto-loader");
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

//Client-side streaming now RPC
const call = client.SubmitSkillUpdates((error, response) => {
    if (error) {
        console.error("Error receiving response:", error.message);
        return;
    }

    console.log("Streaming Summary:", response);

});

//Send multiple streamed messages
call.write({
    job_seeker_id: "JS101",
    skill: "Communication",
});

call.write({
    job_seeker_id: "JS101",
    skill: "Customer Service",
});

call.write({
    job_seeker_id: "JS101",
    skill: "Teamwork",
});

//End stream
call.end();