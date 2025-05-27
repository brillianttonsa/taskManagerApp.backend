// Email configuration
import nodemailer from "nodemailer"

let transporter = null

// Setup email transporter
export const setupEmail = async () => {
  try {
    if (process.env.NODE_ENV === "production") {
      // Production email configuration
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    } else {
      // Development: Use Ethereal for testing
      console.log("setting up email transporter for development..")

      try {
        const testAccount = await nodemailer.createTestAccount()

        transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        })

        console.log("📧 Email transporter set up with Ethereal")
        console.log("📧 Preview URL: https://ethereal.email")
    
        } catch (etherealError) {
          console.error("❌ Could not set up Ethereal email (this is okay for developmenet");
          console.log("Emails will be logged to console instead");
          transporter = null
        }}
    } catch(error){
        console.log("Error setting email transporter:", error);
        console.log("Error setting up email transporter:", error.message);
        console.log("Countuning without email functionality");
        transporter = null
    }
}

// Send email function
export const sendEmail = async (to, subject, html) => {
  try {
    if (!transporter) {
      console.log("📧 Email simulation (no transporter configured):")
      console.log(" To:", to);
      console.log("📧 Subject:", subject)
      console.log("Content preview:", html.substring(0, 100) + "...");
      return true
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TaskFlow" <noreply@taskflow.com>',
      to,
      subject,
      html,
    })

    if (process.env.NODE_ENV !== "production") {
      console.log("📧 Email sent:", info.messageId)
      console.log("📧 Preview URL:", nodemailer.getTestMessageUrl(info))
    }

    return true
  } catch (error) {
    console.error("❌ Error sending email:", error.message)
    return false
  }
}

// Email templates
export const emailTemplates = {
  passwordReset: (username, resetUrl) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Password Reset Request</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>You requested a password reset for your TaskFlow account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `,

  welcomeEmail: (username) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Welcome to TaskFlow!</h2>
      <p>Hello <strong>${username}</strong>,</p>
      <p>Welcome to TaskFlow! We're excited to have you on board.</p>
      <p>Here's what you can do with TaskFlow:</p>
      <ul>
        <li>📋 Create and manage personal tasks</li>
        <li>👨‍👩‍👧‍👦 Create families and collaborate with members</li>
        <li>📊 Track your progress with detailed analytics</li>
        <li>📈 Generate weekly reports</li>
      </ul>
      <p>Happy task managing!</p>
    </div>
  `,
}

export default { setupEmail, sendEmail, emailTemplates }
