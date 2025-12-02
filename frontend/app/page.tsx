import ConversationRoom from '../components/ConversationRoom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8">
        <ConversationRoom />
      </div>
    </div>
  );
}
