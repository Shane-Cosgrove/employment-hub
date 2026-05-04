const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(__dirname, "../protos/registry.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const registryProto = grpc.loadPackageDefinition(packageDefinition);

const registeredServices = {};

function RegisterService(call, callback) {
    const { service_name, host, port } = call.request;

    if (!service_name || !host || !port) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "service_name, host, and port are required",
        });
    }

    registeredServices[service_name] = {service_name, host, port };

    console.log(`Registered service: ${service_name} at ${host}:${port}`);

    callback(null, {
        message: `${service_name} registered successfully`,
    });
}

function DiscoverService(call, callback) {
    const { service_name } = call.request;

    const service = registeredServices[service_name];

    if (!service) {
        return callback(null, {
            service_name,
            host: "",
            port: 0,
            found: false,
        });
    }

    callback(null, {
        ...service,
        found: true,
    });
}

const server = new grpc.Server();

server.addService(registryProto.RegistryService.service, {
    RegisterService,
    DiscoverService,
});

server.bindAsync(
    "0.0.0.0:50050",
    grpc.ServerCredentials.createInsecure(),
    () => {
        console.log("Registry Service running on port 50050");
        server.start();
    }
);