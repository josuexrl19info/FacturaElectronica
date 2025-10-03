"use client"

import { motion } from "framer-motion"
import { LoginForm } from "./login-form"

export function AnimatedLoginForm() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      className="w-full lg:w-1/2 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 lg:hidden" />
      <motion.div 
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      >
        <LoginForm />
      </motion.div>
    </motion.div>
  )
}
