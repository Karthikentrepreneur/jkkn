# Mentor-Mentee System

A comprehensive web application for managing mentor-mentee relationships and service requests.

## Features

- User-friendly interface for mentors and mentees
- Service request management
- Counselling session scheduling
- Dashboard for monitoring activities
- Responsive design for all devices

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase (for backend)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mentor-mentee-system.git
   cd mentor-mentee-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utility functions
└── types/           # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 