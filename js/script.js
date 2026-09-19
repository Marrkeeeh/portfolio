/* ================================================
   Mark Jeryl Omandam — Portfolio JavaScript
   All features organized in one file for simplicity
   ================================================ */

(function () {
    'use strict';

    /* ---------- DOM Ready ---------- */
    document.addEventListener('DOMContentLoaded', function () {
        initThemeToggle();
        initMobileNav();
        initSmoothScroll();
        initActiveNav();
        initScrollReveal();
        initProjectFilters();
        initFooterYear();
        initContactForm();
        initBackToTop();
        initNavbarScroll();
    });

    /* ---------- 1. Dark / Light Mode Toggle ---------- */
    function initThemeToggle() {
        const toggleBtn = document.getElementById('themeToggle');
        if (!toggleBtn) return;

        const body = document.body;
        const STORAGE_KEY = 'portfolio-theme';

        // Load saved preference or default to light
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            body.classList.add('dark');
        }

        toggleBtn.addEventListener('click', function () {
            body.classList.toggle('dark');
            const isDark = body.classList.contains('dark');
            localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
        });
    }

    /* ---------- 2. Mobile Navigation (Hamburger Menu) ---------- */
    function initMobileNav() {
        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        if (!menuToggle || !navLinks) return;

        function closeMenu() {
            menuToggle.classList.remove('open');
            navLinks.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
        }

        menuToggle.addEventListener('click', function () {
            const isOpen = navLinks.classList.toggle('open');
            menuToggle.classList.toggle('open', isOpen);
            menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close menu when a nav link is clicked
        const allLinks = navLinks.querySelectorAll('.nav-link');
        allLinks.forEach(function (link) {
            link.addEventListener('click', closeMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (
                !navLinks.classList.contains('open') ||
                navLinks.contains(e.target) ||
                menuToggle.contains(e.target)
            ) {
                return;
            }
            closeMenu();
        });

        // Close menu on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeMenu();
        });

        // Close menu on resize to desktop
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) closeMenu();
        });
    }

    /* ---------- 3. Smooth Scrolling (Anchor Links) ---------- */
    function initSmoothScroll() {
        const anchors = document.querySelectorAll('a[href^="#"]');

        anchors.forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (!targetId || targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (!targetElement) return;

                e.preventDefault();

                // Account for fixed nav height
                const navHeight = document.getElementById('navbar')?.offsetHeight || 72;
                const targetPosition =
                    targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight + 1;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            });
        });
    }

    /* ---------- 4. Active Navigation State on Scroll ---------- */
    function initActiveNav() {
        const sections = document.querySelectorAll('main section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        if (sections.length === 0 || navLinks.length === 0) return;

        const navHeight = (document.getElementById('navbar')?.offsetHeight || 72) + 4;

        function updateActiveNav() {
            const scrollY = window.pageYOffset;

            let currentId = '';

            sections.forEach(function (section) {
                const sectionTop = section.offsetTop - navHeight;
                const sectionBottom = sectionTop + section.offsetHeight;

                if (scrollY >= sectionTop && scrollY < sectionBottom) {
                    currentId = section.getAttribute('id');
                }
            });

            navLinks.forEach(function (link) {
                const href = link.getAttribute('href');
                if (href === '#' + currentId) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }

        // Use throttling for better performance
        let ticking = false;
        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(function () {
                    updateActiveNav();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Set initial state
        updateActiveNav();
    }

    /* ---------- 5. Scroll Reveal Animations ---------- */
    function initScrollReveal() {
        const elements = document.querySelectorAll('.reveal');
        if (elements.length === 0) return;

        // Fallback for browsers without IntersectionObserver
        if (!('IntersectionObserver' in window)) {
            elements.forEach(function (el) {
                el.classList.add('revealed');
            });
            return;
        }

        const observer = new IntersectionObserver(
            function (entries, obs) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        obs.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.12,
                rootMargin: '0px 0px -40px 0px'
            }
        );

        elements.forEach(function (el) {
            observer.observe(el);
        });
    }

    /* ---------- 6. Footer Current Year ---------- */
    function initFooterYear() {
        const yearSpan = document.getElementById('currentYear');
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    }

    /* ---------- 7. Interactive Project Filters ---------- */
    function initProjectFilters() {
        const filters = document.querySelectorAll('.filter-btn');
        const cards = document.querySelectorAll('.project-card[data-category]');
        const count = document.getElementById('projectCount');
        if (filters.length === 0 || cards.length === 0) return;

        function applyFilter(filter) {
            let visibleCount = 0;

            cards.forEach(function (card) {
                const matches = filter === 'all' || card.dataset.category === filter;
                card.classList.toggle('is-filtered', !matches);
                if (matches) visibleCount += 1;
            });

            filters.forEach(function (button) {
                const isActive = button.dataset.filter === filter;
                button.classList.toggle('active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });

            if (count) {
                count.textContent = visibleCount + (visibleCount === 1 ? ' project' : ' projects');
            }
        }

        filters.forEach(function (button) {
            button.addEventListener('click', function () {
                applyFilter(button.dataset.filter);
            });
        });

        cards.forEach(function (card) {
            card.addEventListener('pointermove', function (event) {
                const bounds = card.getBoundingClientRect();
                card.style.setProperty('--pointer-x', (event.clientX - bounds.left) + 'px');
                card.style.setProperty('--pointer-y', (event.clientY - bounds.top) + 'px');
            });
        });
    }

    /* ---------- 8. Contact Form Validation (Client-Side Only) ---------- */
    function initContactForm() {
        const form = document.getElementById('contactForm');
        if (!form) return;

        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');

        const nameError = document.getElementById('nameError');
        const emailError = document.getElementById('emailError');
        const messageError = document.getElementById('messageError');
        const successMsg = document.getElementById('formSuccess');
        const submitButton = form.querySelector('button[type="submit"]');
        successMsg.hidden = true;

        function setFieldError(input, errorEl, message) {
            if (message) {
                input.parentElement.classList.add('error');
                errorEl.textContent = message;
                input.setAttribute('aria-invalid', 'true');
            } else {
                input.parentElement.classList.remove('error');
                errorEl.textContent = '';
                input.removeAttribute('aria-invalid');
            }
        }

        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(email).toLowerCase());
        }

        function validateName() {
            const value = nameInput.value.trim();
            if (!value) {
                setFieldError(nameInput, nameError, 'Please enter your name.');
                return false;
            }
            if (value.length < 2) {
                setFieldError(nameInput, nameError, 'Name must be at least 2 characters.');
                return false;
            }
            setFieldError(nameInput, nameError, '');
            return true;
        }

        function validateEmailField() {
            const value = emailInput.value.trim();
            if (!value) {
                setFieldError(emailInput, emailError, 'Please enter your email.');
                return false;
            }
            if (!validateEmail(value)) {
                setFieldError(emailInput, emailError, 'Please enter a valid email address.');
                return false;
            }
            setFieldError(emailInput, emailError, '');
            return true;
        }

        function validateMessage() {
            const value = messageInput.value.trim();
            if (!value) {
                setFieldError(messageInput, messageError, 'Please enter a message.');
                return false;
            }
            if (value.length < 10) {
                setFieldError(messageInput, messageError, 'Message must be at least 10 characters.');
                return false;
            }
            setFieldError(messageInput, messageError, '');
            return true;
        }

        // Real-time validation
        nameInput.addEventListener('blur', validateName);
        emailInput.addEventListener('blur', validateEmailField);
        messageInput.addEventListener('blur', validateMessage);

        nameInput.addEventListener('input', function () {
            if (nameInput.parentElement.classList.contains('error')) validateName();
        });
        emailInput.addEventListener('input', function () {
            if (emailInput.parentElement.classList.contains('error')) validateEmailField();
        });
        messageInput.addEventListener('input', function () {
            if (messageInput.parentElement.classList.contains('error')) validateMessage();
        });

        // Form submit
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const isNameValid = validateName();
            const isEmailValid = validateEmailField();
            const isMessageValid = validateMessage();

            if (!isNameValid || !isEmailValid || !isMessageValid) {
                successMsg.hidden = true;
                return;
            }

            submitButton.disabled = true;
            const formData = new FormData(form);
            const subjectValue = document.getElementById('subject').value.trim();
            const messageValue = messageInput.value.trim();
            const inquirySubject = subjectValue
                ? 'Portfolio inquiry: ' + subjectValue
                : 'New portfolio contact message';

            formData.set('subject', inquirySubject);
            formData.set('replyto', emailInput.value.trim());
            formData.set(
                'message',
                'Subject: ' + (subjectValue || 'General inquiry') + '\n\n' + messageValue
            );

            fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: { Accept: 'application/json' }
            })
                .then(function (response) {
                    if (!response.ok) throw new Error('Message could not be sent.');
                    return response.json();
                })
                .then(function (result) {
                    if (!result.success) throw new Error(result.message || 'Message could not be sent.');
                    successMsg.hidden = false;
                    form.reset();
                })
                .catch(function () {
                    successMsg.hidden = true;
                    alert('Your message could not be sent. Please try again.');
                })
                .finally(function () {
                    submitButton.disabled = false;
                });
        });
    }

    /* ---------- 9. Back to Top Button ---------- */
    function initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;

        const THRESHOLD = 300;

        function toggleButton() {
            if (window.pageYOffset > THRESHOLD) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }
        }

        window.addEventListener('scroll', toggleButton, { passive: true });

        btn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        toggleButton();
    }

    /* ---------- 9. Navbar Shadow on Scroll ---------- */
    function initNavbarScroll() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        function toggleShadow() {
            if (window.pageYOffset > 10) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        window.addEventListener('scroll', toggleShadow, { passive: true });
        toggleShadow();
    }
})();
