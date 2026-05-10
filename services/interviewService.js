const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const INTERVIEW_PROTO = path.join(__dirname, "../protos/interview.proto");
const REGISTRY_PROTO = path.join(__dirname, "../protos/registry.proto");

const interviewPackageDef = protoLoader.loadSync(INTERVIEW_PROTO, {
    keepCase: true,
    defaults: true,
});

const registryPackageDef = protoLoader.loadSync(REGISTRY_PROTO, {
    keepCase: true,
    defaults: true,
});

const interviewProto = grpc.loadPackageDefinition(interviewPackageDef).interview;
const registryProto = grpc.loadPackageDefinition(registryPackageDef);

const slots = [];
const bookings = [];

function CreateInterviewSlot(call, callback) {
    const { slot_id, employer_id, date_time } = call.request;

    if (!slot_id || !employer_id || !date_time) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "slot_id, employer_id, and date_time are required",
        });
    }
    
    slots.push({
        slot_id,
        employer_id,
        date_time,
        available: true,
    });

    callback(null, {
        message: `Interview slot ${slot_id} created successfully`,
    });
}

function BookInterview(call, callback) {
    const { slot_id, candidate_id } = call.request;

    if (!slot_id || !candidate_id) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "slot_id and candidate_id are required",
        });
    }

    const slot = slots.find((s) => s.slot_id === slot_id);

    if (!slot) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Interview slot not found",
        });
    }

    if (!slot.available) {
        return callback({
            code: grpc.status.FAILED_PRECONDITION,
            message: "Interview slot is not available",
        });
    }

    const booking_id = `B${bookings.length + 1}`;

    const booking = {
        booking_id,
        slot_id,
        candidate_id,
        status: "Booked", 
    };

    bookings.push(booking);
    slot.available = false;

    callback(null, {
        booking_id,
        status: "Booked",
        message: "Interview slot booked successfully",
    });
}

function GetInterviewStatus(call, callback) {
    const { booking_id } = call.request;

    if (!booking_id) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "booking_id is required",
        });
    }

    const booking = bookings.find((b) => b.booking_id === booking_id);

    if (!booking) {
        return callback({
            code: grpc.status.NOT_FOUND,
            message: "Booking not found",
        });
    }

    callback(null, booking);
}

function registerWithRegistry() {
    const registryClient = new registryProto.RegistryService(
        "localhost:50050",
        grpc.credentials.createInsecure()       
    );

    registryClient.RegisterService(
        {
            service_name: "InterviewService",
            host: "localhost",
            port: 50052,
        },
        (error, response) => {
            if (error) {
                console.error("Failed to register InterviewService:", error.message);
            } else {
                console.log(response.message);
            }
        }
    );
}

const server = new grpc.Server();

server.addService(interviewProto.InterviewService.service, {
    CreateInterviewSlot,
    BookInterview,
    GetInterviewStatus,     
});

server.bindAsync(
    "0.0.0.0:50052",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("InterviewService running on port 50052");
        registerWithRegistry();
        server.start();
    }
);