const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require("path");

const INTERVIEW_PROTO = path.join(__dirname, "../protos/interview.proto");

const packageDef = protoLoader.loadSync(INTERVIEW_PROTO, {
    keepCase: true,
    defaults: true,
});

const interviewProto = grpc.loadPackageDefinition(packageDef).interview;

const client = new interviewProto.InterviewService(
    "localhost:50052",
    grpc.credentials.createInsecure()
);

//Step 1: Creating Interview Slot
client.CreateInterviewSlot(
    {
        slot_id: "S101",
        employer_id: "EMP01",
        date_time: "2026-02-02 10:00",
    },
    (error, response) => {
        if (error) {
            console.error("CreateInterviewSlot error:", error.message);
            return;
        }

        console.log("CreateInterviewSlot:", response.message);

        // Step 2: Booking the interview
        client.BookInterview(
            {
                slot_id: "S101",
                candidate_id: "JS101",
            },
            (error, response) => {
                if (error) {
                    console.error("BookInterview error:", error.message);
                    return;
                }

                console.log("BookInterview:", response);

                const bookingId = response.booking_id;

                //Step 3: getting interview status
                client.GetInterviewStatus(
                    {
                        booking_id: bookingId,
                    },
                    (error, response) => {
                        if (error) {
                            console.error("GetInterviewStatus error:", error.message);
                            return;
                        }

                        console.log("GetInterviewStatus:", response);
                    }
                );
            }
        );
    }
);