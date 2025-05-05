'use client'

import { motion } from 'framer-motion'
import { FaRocket, FaUsers, FaLightbulb } from 'react-icons/fa'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Welcome to Our Platform
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Connect, Learn, and Grow with our innovative mentoring platform
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup" className="px-8 py-3 bg-purple-600 rounded-full hover:bg-purple-700 transition-colors">
              Get Started
            </Link>
            <Link href="/login" className="px-8 py-3 border border-purple-600 rounded-full hover:bg-purple-600/20 transition-colors">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm"
          >
            <FaRocket className="text-4xl text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Fast & Efficient</h3>
            <p className="text-gray-400">Experience lightning-fast performance with our optimized platform</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm"
          >
            <FaUsers className="text-4xl text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
            <p className="text-gray-400">Join a thriving community of mentors and mentees</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="p-6 rounded-xl bg-gray-800/50 backdrop-blur-sm"
          >
            <FaLightbulb className="text-4xl text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Learning</h3>
            <p className="text-gray-400">Personalized learning paths powered by AI</p>
          </motion.div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center p-12 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-purple-100">Join thousands of learners and mentors today</p>
          <Link href="/signup" className="px-8 py-3 bg-white text-purple-600 rounded-full hover:bg-gray-100 transition-colors">
            Get Started Now
          </Link>
        </motion.div>
      </div>
    </div>
  )
} 