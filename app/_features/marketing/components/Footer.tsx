import Link from "next/link";
import config from "@/config";

// Add the Footer to the bottom of your landing page and more.
// The support link is connected to the config.js file. If there's no config.resend.supportEmail, the link won't be displayed.

const Footer = () => {
  return (
    <footer className="bg-muted/20 border-t border-border/10">
      <div className="max-w-7xl mx-auto px-8 py-24">
        <div className=" flex lg:items-start md:flex-row md:flex-nowrap flex-wrap flex-col">
          <div className="w-64 flex-shrink-0 md:mx-0 mx-auto text-center md:text-left">
            <Link
              href="/#"
              aria-current="page"
              className="flex gap-2 justify-center md:justify-start items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/salt-icon-aurora.svg"
                alt=""
                className="h-5 w-5"
              />
              <span className="text-[15px] font-semibold tracking-[-0.01em]">
                {config.appName}
              </span>
            </Link>

            <p className="mt-3 text-sm text-muted-foreground">
              {config.appDescription}
            </p>
            <p className="mt-3 text-sm text-muted-foreground/80">
              Copyright © {new Date().getFullYear()} - All rights reserved
            </p>

          </div>
          <div className="flex-grow flex flex-wrap justify-center -mb-10 md:mt-0 mt-10 text-center">
            <div className="lg:w-1/3 md:w-1/2 w-full px-4">
              <div className="footer-title font-semibold text-foreground tracking-widest text-sm md:text-left mb-3">
                LINKS
              </div>

              <div className="flex flex-col justify-center items-center md:items-start gap-2 mb-10 text-sm">
                {config.resend.supportEmail && (
                  <a
                    href={`mailto:${config.resend.supportEmail}`}
                    target="_blank"
                    className="link link-hover"
                    aria-label="Contact Support"
                  >
                    Support
                  </a>
                )}
                <Link href="/#waitlist" className="link link-hover">
                  Waitlist
                </Link>
                <a href="/#" target="_blank" className="link link-hover">
                  Affiliates
                </a>
              </div>
            </div>

            <div className="lg:w-1/3 md:w-1/2 w-full px-4">
              <div className="footer-title font-semibold text-foreground tracking-widest text-sm md:text-left mb-3">
                LEGAL
              </div>

              <div className="flex flex-col justify-center items-center md:items-start gap-2 mb-10 text-sm">
                <Link href="/terms-of-service" className="link link-hover">
                  Terms of Service
                </Link>
                <Link href="/privacy-policy" className="link link-hover">
                  Privacy policy
                </Link>
                <Link href="/cookie-policy" className="link link-hover">
                  Cookie policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
