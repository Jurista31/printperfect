import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, User, Mail, Shield, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import PrinterProfiles from './PrinterProfiles';
import MaintenanceLogs from './MaintenanceLogs';

export default function AccountSettings({ onClose }) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Delete user's data (analyses, shared posts, feedback, etc.)
      const analyses = await base44.entities.PrintAnalysis.list();
      const shared = await base44.entities.SharedAnalysis.list();
      const feedback = await base44.entities.AnalysisFeedback.list();
      
      // Delete in parallel
      await Promise.all([
        ...analyses.map(a => base44.entities.PrintAnalysis.delete(a.id)),
        ...shared.map(s => base44.entities.SharedAnalysis.delete(s.id)),
        ...feedback.map(f => base44.entities.AnalysisFeedback.delete(f.id))
      ]);

      toast.success('Account data deleted. Logging out...');
      
      // Logout after brief delay
      setTimeout(() => {
        base44.auth.logout();
      }, 1500);
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account data');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{user.full_name || 'User'}</h3>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400">
            Role: <span className="text-white font-medium capitalize">{user.role}</span>
          </span>
        </div>
      </div>

      {/* Printer Profiles */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <PrinterProfiles />
      </div>

      {/* Maintenance Logs */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
        <MaintenanceLogs />
      </div>

      {/* Account Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-slate-400 px-1">Account Actions</h4>
        
        <Button
          variant="outline"
          className="w-full justify-start text-slate-300 border-slate-700 hover:bg-slate-800"
          onClick={() => base44.auth.logout()}
        >
          <Mail className="w-4 h-4 mr-2" />
          Sign Out
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full justify-start"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-slate-800 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This will permanently delete all your data including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All print analyses</li>
                  <li>Shared community posts</li>
                  <li>Feedback and ratings</li>
                  <li>Analysis history</li>
                </ul>
                <p className="mt-3 font-semibold text-red-400">
                  This action cannot be undone.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Everything'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Info */}
      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
        <p className="text-xs text-slate-500 leading-relaxed">
          Your account data is stored securely and only used to provide the PrintDoc service. 
          You can export or delete your data at any time.
        </p>
      </div>
    </div>
  );
}