export default function handler(req, res) {
  res.status(200).json({
    status: "NotarVeri attestation API ready",
    timestamp: Date.now()
  });
}
