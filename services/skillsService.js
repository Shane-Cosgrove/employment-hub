const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const SKILLS_PROTO = path.join(__dirname, "../protos/skills.proto");
const REGISTRY_PROTO = path.join(__dirname, "../protos/registry.proto");

const skillsPackageDef = protoLoader.loadSync(SKILLS_PROTO, {
    keepCase: true,
    defaults: true,
    oneofs: true,
});

const registryPackageDef = protoLoader.loadSync(REGISTRY_PROTO, {
    keepCase: true,
    defaults: true,
});

const skillsProto = grpc.loadPackageDefinition(skillsPackageDef).skills;
const registryProto = grpc.loadPackageDefinition(registryPackageDef);

function AnalyzeSkillGap(call, callback) {
    const { job_seeker_id, target_job_id, current_skills, required_skills } = call.request;

    if (!job_seeker_id || !target_job_id || !current_skills.length || !required_skills.length) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "job_seeker_id, target_job_id, current_skills, and required_skills are required",
        });
    }

    const missing_skills = required_skills.filter(
        (skill) => !current_skills.includes(skill)
    );

    callback(null, {
        missing_skills,
        message: "Skill gap analysis completed successfully",
    });
}

function RecommendTraining(call, callback) {
    const { missing_skills } = call.request;

    if (!missing_skills || missing_skills.length === 0) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "missing_skills is required and cannot be empty",
        });
    }   

    const recommended_courses = missing_skills.map(
        (skill) => `${skill} Fundamentals Training`
    );

    callback(null, {
        recommended_courses,
        message: "Training recommendations generated successfully",
    });         
}   

function registerWithRegistry() {
    const registryClient = new registryProto.RegistryService(
        "localhost:50050",
        grpc.credentials.createInsecure()       
    );

    registryClient.RegisterService(
        {
        service_name: "SkillsService",
        host: "localhost",
        port: 50053,            
        },
        (error, response) => {
            if (error) {
                console.error("Failed to register SkillsService:", error.message);
            } else {
                console.log(response.message);
            }
        }
    );
}

const server = new grpc.Server();

server.addService(skillsProto.SkillsService.service, {
    AnalyzeSkillGap,
    RecommendTraining,      
});

server.bindAsync(
    "0.0.0.0:50053",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("SkillsService running on port 50053");
        registerWithRegistry();
        server.start();
    }
);