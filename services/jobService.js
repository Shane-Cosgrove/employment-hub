const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const JOB_PROTO = path.join(__dirname, "../protos/job.proto");
const REGISTRY_PROTO = path.join(__dirname, "../protos/registry.proto");

const jobPackageDef = protoLoader.loadSync(JOB_PROTO, {
    keepCase: true,
    defaults: true,
});

const registryPackageDef = protoLoader.loadSync(REGISTRY_PROTO, {
    keepCase: true,
    defaults: true,
});

const jobProto = grpc.loadPackageDefinition(jobPackageDef);
const registryProto = grpc.loadPackageDefinition(registryPackageDef);
console.log("Loaded job proto:", Object.keys(jobProto));
console.log("Loaded registry proto:", Object.keys(registryProto));

const jobSeekers = [];
const jobs = [];

function RegisterJobSeeker(call, callback) {
    const { job_seeker_id, name, skills } = call.request;

    if (!job_seeker_id || !name || !skills || skills.length === 0) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "job_seeker_id, name, and skills are required",
        });
    }

    jobSeekers.push({ job_seeker_id, name, skills });
    callback(null, { message: `Job seeker ${name} registered successfully` });
}

function PostJob(call, callback) {
    const { job_id, title, required_skills } = call.request;

    if (!job_id || !title || !required_skills || required_skills.length === 0) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "job_id, title, and required_skills are required",
        });
    }

    const existingJob = jobs.find((j) => j.job_id === job_id);

    if (existingJob) {
        return callback({
            code: grpc.status.ALREADY_EXISTS,
            message: "Job already exists",
        });
    }

    jobs.push({ job_id, title, required_skills });
    callback(null, { message: `Job ${title} posted successfully` });
}

function FindMatches(call) {
    const { job_seeker_id } = call.request;

    const seeker = jobSeekers.find((s) => s.job_seeker_id === job_seeker_id);

    if (!seeker) {
        call.emit("error", {
            code: grpc.status.NOT_FOUND,
            message: "Job seeker not found",
        });
        return;
    }

    jobs.forEach((job) => {
        const matchedSkills = job.required_skills.filter((skill) =>
        seeker.skills.includes(skill)
    );

    const match_score = Math.round(
        (matchedSkills.length / job.required_skills.length) * 100
    );

    call.write({
        job_id: job.job_id,
        title: job.title,
        match_score,
    });
});
    call.end();
}

function registerWithRegistry() {
    const registryClient = new registryProto.RegistryService(
        "localhost:50050",
        grpc.credentials.createInsecure()
    );

    registryClient.RegisterService(
        {
            service_name: "JobService",
            host: "localhost",
            port: 50051,
        },
        (error, response) => {
            if (error) {
                console.error("Failed to register JobService:", error.message);
            } else {
                console.log(response.message);
            }
        }
    );
}

const server = new grpc.Server();

server.addService(jobProto.job.JobService.service, {
    RegisterJobSeeker,
    PostJob,
    FindMatches,
});

server.bindAsync(
    "0.0.0.0:50051",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("JobService running on port 50051");
        registerWithRegistry();
        server.start();
    }
);