export default function handler(req, res) {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: Date.now(),
    env_ready: !!(process.env.SIGNING_KEY && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.API_KEY)
  });
}
