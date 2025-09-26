import { useState, useEffect } from 'react';

/**
 * A custom hook to fetch and manage user data.
 * It fetches a user from a sample API endpoint.
 *
 * @param {string | number} [userId] - The ID of the user to fetch. If not provided, it defaults to fetching user with ID 1.
 * @returns {{user: object | null, loading: boolean, error: Error | null}} An object containing the user data, loading state, and error state.
 */
const useUser = (userId) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If no userId is provided, you might want to fetch the current logged-in user.
    // This logic depends on your authentication setup.
    // For this example, we'll default to user 1 if no userId is passed.
    const targetUserId = userId || 1;
    const endpoint = `https://jsonplaceholder.typicode.com/users/${targetUserId}`;

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      setUser(null); // Reset user state on new fetch

      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setUser(data);
      } catch (e) {
        setError(e);
        console.error("Failed to fetch user:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]); // Re-run the effect if the userId changes

  return { user, loading, error };
};

export default useUser;