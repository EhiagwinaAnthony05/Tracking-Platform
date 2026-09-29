const mongoose = require('mongoose')

async function connectDB(retries = 5, delay = 5000) {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			await mongoose.connect(process.env.MONGODB_URI)
			console.log('MongoDB connected')
			return
		} catch (error) {
			console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`)
			if (attempt < retries) {
				console.log(`Retrying in ${delay / 1000}s...`)
				await new Promise((resolve) => setTimeout(resolve, delay))
			}
		}
	}
	console.error('MongoDB connection failed after all retries. Server will continue without DB.')
}

module.exports = connectDB