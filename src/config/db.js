import dns from "node:dns";
import mongoose from "mongoose";

// Override Windows system DNS with Google's public DNS so
// mongodb+srv SRV lookups work even when the local resolver blocks them.
dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

export async function connectDb() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error(
      "MONGODB_URI is required. Set it in .env (local) or in the container environment (VPS)."
    );
  }
  await mongoose.connect(uri);

  mongoose.connection.on("disconnected", () => {
    // eslint-disable-next-line no-console
    console.error("MongoDB disconnected");
  });
  mongoose.connection.on("reconnected", () => {
    // eslint-disable-next-line no-console
    console.log("MongoDB reconnected");
  });

  return mongoose.connection;
}
