"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { Badge } from "@/app/_components/ui/badge";
import { ConfirmDialog } from "@repo/patterns";
import {
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  checkDomainVerification,
  retryDomainVerification,
  removeCustomDomain,
} from "@/app/_features/serve/actions";

interface Domain {
  id: string;
  hostname: string;
  status: string;
  ssl_status: string | null;
  verified_at: string | null;
  created_at: string;
}

interface DomainStatusCardProps {
  domain: Domain;
  onRemoved?: () => void;
}

export function DomainStatusCard({ domain, onRemoved }: DomainStatusCardProps) {
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(domain.status);
  const [sslStatus, setSslStatus] = useState(domain.ssl_status);

  // Poll for verification status if pending
  useEffect(() => {
    if (currentStatus === "pending") {
      const interval = setInterval(async () => {
        const result = await checkDomainVerification(domain.id);
        if (result.verified) {
          setCurrentStatus("verified");
          setSslStatus(result.sslReady ? "active" : "pending");
          toast.success(domain.hostname + " has been verified!");
        }
      }, 30000); // Check every 30 seconds

      return () => clearInterval(interval);
    }
  }, [domain.id, domain.hostname, currentStatus]);

  const handleRetryVerification = async () => {
    setChecking(true);
    try {
      const result = await retryDomainVerification(domain.id);
      if (result.verified) {
        setCurrentStatus("verified");
        toast.success("Domain verified successfully!");
      } else {
        toast.success("Verification check triggered. This may take a few minutes.");
      }
    } catch (error) {
      toast.error("Failed to check verification");
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const result = await removeCustomDomain(domain.id);
      if (result.success) {
        toast.success("Domain removed");
        onRemoved?.();
      } else {
        toast.error(result.error || "Failed to remove domain");
      }
    } catch (error) {
      toast.error("Failed to remove domain");
    } finally {
      setRemoving(false);
    }
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending Verification
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Verification Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {currentStatus}
          </Badge>
        );
    }
  };

  const getSslBadge = () => {
    if (currentStatus !== "verified") return null;

    if (sslStatus === "active") {
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          <Shield className="h-3 w-3 mr-1" />
          SSL Active
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600">
        <Shield className="h-3 w-3 mr-1" />
        SSL Pending
      </Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base font-mono">
                {domain.hostname}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {getSslBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Added {new Date(domain.created_at).toLocaleDateString()}
              {domain.verified_at && (
                <> · Verified {new Date(domain.verified_at).toLocaleDateString()}</>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentStatus === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryVerification}
                  disabled={checking}
                >
                  <RefreshCw className={"h-4 w-4 mr-1 " + (checking ? "animate-spin" : "")} />
                  {checking ? "Checking..." : "Check Now"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                disabled={removing}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        title="Remove Domain"
        description={"Are you sure you want to remove " + domain.hostname + "? This will disconnect your custom domain from the Bridge portal."}
        confirmText="Remove"
        onConfirm={handleRemove}
        loading={removing}
        variant="destructive"
      />
    </>
  );
}
