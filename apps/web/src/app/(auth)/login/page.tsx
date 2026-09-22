'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  ArrowRight,
  Braces,
  Code2,
  Eye,
  EyeOff,
  Layers3,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

import styles from './login.module.css';

const DUMMY_USER = {
  email: 'learner@elab.com',
  password: 'Elab@123',
};

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] =
    useState(false);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setIsLoading(true);

    const validEmail =
      email.trim().toLowerCase() ===
      DUMMY_USER.email;

    const validPassword =
      password === DUMMY_USER.password;

    if (validEmail && validPassword) {
      localStorage.setItem(
        'elab_dummy_auth',
        'true',
      );

      localStorage.setItem(
        'elab_dummy_user',
        DUMMY_USER.email,
      );

      router.push('/dashboard');

      return;
    }

    setError('Invalid email or password.');
    setIsLoading(false);
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>

        {/* LEFT SIDE */}

        <section className={styles.brandPanel}>
          <div className={styles.logoRow}>

            <div className={styles.logoIcon}>
              <Braces size={26} strokeWidth={2} />
            </div>

            <div className={styles.logoText}>
              e<span>Lab</span>
            </div>

          </div>


          <div className={styles.hero}>

            <div className={styles.eyebrow}>
              Practice • Build • Solve
            </div>

            <h1 className={styles.heroTitle}>
              Build skills.
              <br />

              Solve problems.

              <br />

              <span
                className={
                  styles.heroTitleAccent
                }
              >
                Prove your potential.
              </span>
            </h1>

            <p
              className={
                styles.heroDescription
              }
            >
              A hands-on engineering practice
              environment for programming
              languages, technology stacks and
              real-world software challenges.
            </p>

          </div>


          <div className={styles.featureGrid}>

            <div className={styles.featureCard}>

              <div className={styles.featureIcon}>
                <Code2 size={19} />
              </div>

              <p className={styles.featureTitle}>
                Practice
              </p>

              <p
                className={
                  styles.featureDescription
                }
              >
                Languages and technologies
              </p>

            </div>


            <div className={styles.featureCard}>

              <div className={styles.featureIcon}>
                <Layers3 size={19} />
              </div>

              <p className={styles.featureTitle}>
                Build
              </p>

              <p
                className={
                  styles.featureDescription
                }
              >
                Full technology stacks
              </p>

            </div>


            <div className={styles.featureCard}>

              <div className={styles.featureIcon}>
                <Trophy size={19} />
              </div>

              <p className={styles.featureTitle}>
                Challenge
              </p>

              <p
                className={
                  styles.featureDescription
                }
              >
                Real-world engineering tasks
              </p>

            </div>

          </div>
        </section>


        {/* RIGHT SIDE */}

        <section className={styles.formPanel}>

          <div className={styles.loginCard}>

            <div className={styles.loginIcon}>
              <LockKeyhole size={27} />
            </div>


            <h2 className={styles.title}>
              Welcome back
            </h2>

            <p className={styles.subtitle}>
              Sign in to access your learner
              workspace.
            </p>


            <form
              onSubmit={handleSubmit}
              className={styles.form}
            >

              {/* EMAIL */}

              <div className={styles.field}>

                <label
                  htmlFor="email"
                  className={styles.label}
                >
                  Email address
                </label>

                <div
                  className={
                    styles.inputShell
                  }
                >

                  <Mail
                    size={18}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    placeholder="learner@elab.com"
                    className={styles.input}
                    required
                  />

                </div>

              </div>


              {/* PASSWORD */}

              <div className={styles.field}>

                <div
                  className={
                    styles.fieldHeader
                  }
                >

                  <label
                    htmlFor="password"
                    className={styles.label}
                  >
                    Password
                  </label>

                  <button
                    type="button"
                    className={styles.forgot}
                  >
                    Forgot password?
                  </button>

                </div>


                <div
                  className={
                    styles.inputShell
                  }
                >

                  <LockKeyhole
                    size={18}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your password"
                    className={styles.input}
                    required
                  />


                  <button
                    type="button"
                    className={
                      styles.passwordAction
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>

                </div>

              </div>


              <div className={styles.optionsRow}>

                <label
                  className={
                    styles.rememberLabel
                  }
                >
                  <input
                    type="checkbox"
                    className={
                      styles.checkbox
                    }
                  />

                  Remember me
                </label>

              </div>


              {error && (
                <div
                  role="alert"
                  className={styles.error}
                >
                  {error}
                </div>
              )}


              <button
                type="submit"
                disabled={isLoading}
                className={
                  styles.signInButton
                }
              >

                {isLoading
                  ? 'Signing in...'
                  : 'Sign In'}

                {!isLoading && (
                  <ArrowRight
                    size={17}
                    strokeWidth={2.2}
                  />
                )}

              </button>

            </form>


            <div className={styles.demo}>

              <div className={styles.demoIcon}>
                <ShieldCheck size={18} />
              </div>

              <div>

                <p className={styles.demoTitle}>
                  Demo access
                </p>

                <p
                  className={
                    styles.demoCredentials
                  }
                >
                  learner@elab.com
                  <br />
                  Elab@123
                </p>

              </div>

            </div>


            <p className={styles.footer}>
              eLab • Engineering Practice
              Platform
            </p>

          </div>

        </section>

      </div>
    </main>
  );
}