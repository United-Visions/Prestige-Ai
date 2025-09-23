import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loader2, Database, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { isDBConnected, connectDB } from '@/lib/db';
import { User, createUser, findUserByEmail } from '@/lib/schemas';
import { Input } from './ui/input';
import { Label } from './ui/label';

export function DatabaseDemo() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsConnected(isDBConnected());
      if (isDBConnected()) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connectToDatabase = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectDB();
      setIsConnected(true);
      await loadUsers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to connect to database');
    } finally {
      setIsConnecting(false);
    }
  };

  const loadUsers = async () => {
    if (!isDBConnected()) return;
    
    setIsLoading(true);
    try {
      const allUsers = await User.find().limit(10).sort({ createdAt: -1 });
      setUsers(allUsers);
    } catch (error) {
      setError('Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Check if user already exists
      const existingUser = await findUserByEmail(newUser.email);
      if (existingUser) {
        setError('User with this email already exists');
        return;
      }

      await createUser(newUser);
      setNewUser({ name: '', email: '' });
      await loadUsers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true);
    try {
      await User.findByIdAndDelete(userId);
      await loadUsers();
    } catch (error) {
      setError('Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          MongoDB Database Demo
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Demonstration of MongoDB integration with in-memory database
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Database not connected. Click below to start the in-memory MongoDB instance.
            </p>
            <Button 
              onClick={connectToDatabase} 
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {isConnecting ? 'Connecting...' : 'Connect to MongoDB'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add User Form */}
            <div className="p-4 border rounded-lg space-y-4">
              <h4 className="font-medium">Add New User</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddUser}
                disabled={isLoading || !newUser.name.trim() || !newUser.email.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add User
              </Button>
            </div>

            {/* Users List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Users ({users.length})</h4>
                <Button variant="outline" size="sm" onClick={loadUsers} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </Button>
              </div>

              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No users found. Add some users to see them here.
                </p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user._id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}