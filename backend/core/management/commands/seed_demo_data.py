from django.core.management.base import BaseCommand
from core.models import User, Department, Startup, Challenge, Application, EligibilityResult, Evaluation, Contract, ScaleUpEntry, AuditLog

class Command(BaseCommand):
    help = 'Seed demo data for GovLaunch hackathon'

    def handle(self, *args, **kwargs):
        self.stdout.write("Clearing existing data...")
        # Clear ai_assist tables first (FK deps)
        try:
            from ai_assist.models import (
                SubmissionAnalysis, EvaluatorOverride, RewriteSuggestion,
                ClusterGroup, PSInsight, AIActionLog
            )
            AIActionLog.objects.all().delete()
            EvaluatorOverride.objects.all().delete()
            RewriteSuggestion.objects.all().delete()
            ClusterGroup.objects.all().delete()
            SubmissionAnalysis.objects.all().delete()
            PSInsight.objects.all().delete()
            self.stdout.write("  ai_assist tables cleared.")
        except Exception as e:
            self.stdout.write(f"  ai_assist clear skipped: {e}")

        AuditLog.objects.all().delete()
        ScaleUpEntry.objects.all().delete()
        Contract.objects.all().delete()
        Evaluation.objects.all().delete()
        EligibilityResult.objects.all().delete()
        Application.objects.all().delete()
        Challenge.objects.all().delete()
        Startup.objects.all().delete()
        Department.objects.all().delete()
        User.objects.all().delete()

        self.stdout.write("Creating Users & Departments...")
        d1_user = User.objects.create_user(username='health.dept', password='demo1234', role='department')
        d1 = Department.objects.create(user=d1_user, name='Ministry of Health & Family Welfare', ministry='Health')
        
        d2_user = User.objects.create_user(username='defence.dept', password='demo1234', role='department')
        d2 = Department.objects.create(user=d2_user, name='Ministry of Defence — Innovation Cell', ministry='Defence')

        d3_user = User.objects.create_user(username='niti.dept', password='demo1234', role='department')
        d3 = Department.objects.create(user=d3_user, name='NITI Aayog — District Innovation Program', ministry='Planning')

        self.stdout.write("Creating Startups...")
        s_data = [
            ('MediTriage AI',        ['healthtech','AI'],          3, 2024, 'DIPP12345', 'meditriage-ai',        'dpiit_recognized', 'We use transformer-based NLP models to triage patient symptoms during teleconsultation queues, routing urgent cases to specialists within minutes. Our pilot at two urban clinics reduced average wait-to-diagnosis time by 38%.'),
            ('AgroSense Labs',        ['agritech','IoT'],           5, 2023, 'DIPP12346', 'agrosense-labs',        'dpiit_recognized', 'We deploy low-cost soil-and-air sensor networks that give smallholder farmers real-time crop health dashboards on basic smartphones. Our sensors cost 70% less than commercial alternatives and have been field-tested across 200 farms in Maharashtra.'),
            ('SecureGrid Systems',    ['defense-tech','cybersecurity'], 8, 2022, 'DIPP12347', 'securegrid-systems', 'dpiit_recognized', 'We build mesh sensor arrays for perimeter intrusion detection that operate on solar power with encrypted LoRa communication. Our systems have been tested in harsh terrain conditions across three defence research pilot sites.'),
            ('RuralPay Connect',      ['fintech'],                  2, 2024, 'DIPP12348', 'ruralpay-connect',      'dpiit_recognized', 'We enable UPI-based micro-payments for rural service providers who lack traditional banking infrastructure. Our offline-first architecture processes transactions locally and syncs when connectivity returns.'),
            ('CleanAir Sensors',      ['cleantech','IoT'],          4, 2023, 'DIPP12349', 'cleanair-sensors',      'dpiit_recognized', 'We manufacture PM2.5 and NO2 sensor nodes at one-tenth the cost of reference-grade monitors, calibrated using machine learning. Our network of 500 nodes across Pune provides hyperlocal air quality data to municipal authorities.'),
            ('DiagnoAI',              ['healthtech','AI'],          6, 2021, 'DIPP12350', 'diagnoai',              'dpiit_recognized', 'We provide AI-powered diagnostic support for chest X-rays and retinal scans, enabling early detection of TB and diabetic retinopathy at primary care level. Our models are validated on Indian patient datasets and integrated with two state health platforms.'),
            ('DroneWatch Defence',    ['defense-tech'],             3, 2024, 'DIPP12351', 'dronewatch-defence',    'dpiit_recognized', 'We develop autonomous fixed-wing surveillance drones with onboard edge-AI for real-time threat classification. Our drones operate in GPS-denied environments using visual-inertial navigation.'),
            ('WaterGrid Analytics',   ['cleantech'],                2, 2024, 'DIPP12352', 'watergrid-analytics',   'dpiit_recognized', 'We build portable water quality testing kits with IoT-connected sensors that transmit results to a central dashboard in real time. Our kits test for 12 contaminants and produce lab-comparable results in under 10 minutes.'),
            # Innovator Track — pre-DPIIT startups
            ('GreenBridge Robotics',  ['cleantech'],                2, 2025, '',          'greenbridge-robotics',  'unregistered',     'Two-person team prototyping low-cost robotic weeding for smallholder farms; pre-incorporation.'),
            ('NeuroPath Diagnostics', ['healthtech','AI'],          3, 2025, '',          'neuropath-diagnostics', 'incorporated',     'Incorporated 6 weeks ago, DPIIT application filed and pending review.'),
        ]
        startups = {}
        for name, tags, team, year, dpiit, username, reg_status, pitch in s_data:
            u = User.objects.create_user(username=username, password='demo1234', role='startup')
            s = Startup.objects.create(
                user=u, name=name, sector_tags=tags, team_size=team,
                founded_year=year, dpiit_id=dpiit, pitch_summary=pitch,
                registration_status=reg_status,
            )
            startups[name] = s

        self.stdout.write("Creating Challenges...")
        c1 = Challenge.objects.create(
            department=d1,
            title='AI-Assisted Teleconsultation Triage for Rural PHCs',
            background='Rural primary health centres (PHCs) in underserved districts face chronic specialist shortages, leading to average teleconsultation wait times exceeding 45 minutes. Patients often abandon the queue or travel long distances to district hospitals for conditions that could be triaged remotely.',
            outcome_metrics='Reduce average teleconsultation wait time by 40% within a 12-week pilot across 5 primary health centres',
            constraints='Solution must work on low-bandwidth connections (2G/3G). Must integrate with existing NHA health ID infrastructure. No patient data may leave Indian jurisdiction.',
            budget_ceiling=2500000,
            timeline_weeks=12,
            sector_tags=['healthtech'],
            status='open',
            eligibility_rules={'requires_dpiit': True, 'min_team_size': 0, 'requires_no_blacklist': True, 'min_turnover_required': False}
        )
        c2 = Challenge.objects.create(
            department=d2,
            title='Low-Cost Perimeter Surveillance Sensor Network',
            background='Existing border-post monitoring systems rely on expensive CCTV networks with significant blind spots in remote terrain. Manual patrol coverage is limited by personnel availability and terrain accessibility, leaving gaps in perimeter security.',
            outcome_metrics='Achieve 95% detection accuracy for perimeter breach events within a 16-week field trial',
            constraints='Sensors must operate in extreme temperature ranges (-10°C to 50°C). Power consumption must allow solar-battery operation. All communication must be encrypted to military-grade standards.',
            budget_ceiling=4000000,
            timeline_weeks=16,
            sector_tags=['defense-tech'],
            status='open',
            eligibility_rules={'requires_dpiit': True, 'min_team_size': 0, 'requires_no_blacklist': True, 'min_turnover_required': False}
        )
        c3 = Challenge.objects.create(
            department=d3,
            title='District-Level Groundwater Quality Monitoring',
            background='Current water quality testing requires samples to be sent to state laboratories, resulting in a 14-day turnaround that delays public health interventions. Contamination events in rural groundwater sources often go undetected for weeks.',
            outcome_metrics='Cut water-quality report turnaround from 14 days to 48 hours across 10 pilot villages',
            constraints='Testing devices must be operable by village-level health workers with minimal training. Results must integrate with IMIS (Integrated Management Information System). Cost per test must not exceed ₹50.',
            budget_ceiling=1800000,
            timeline_weeks=10,
            sector_tags=['cleantech'],
            status='open',
            eligibility_rules={'requires_dpiit': True, 'min_team_size': 0, 'requires_no_blacklist': True, 'min_turnover_required': False}
        )
        c4 = Challenge.objects.create(
            department=d1,
            title='Digital Immunization Follow-Up System',
            background='Post-vaccination follow-up for routine immunization programs relies on manual record-keeping at sub-centre level, leading to significant dropout between first and subsequent doses.',
            outcome_metrics='Increase immunization series completion rate by 25% in pilot districts within 8 weeks.',
            constraints='Must work offline and sync when connectivity is available. Must comply with MoHFW data standards.',
            budget_ceiling=1200000,
            timeline_weeks=8,
            sector_tags=['healthtech'],
            status='draft',
            eligibility_rules={'requires_dpiit': True, 'min_team_size': 0, 'requires_no_blacklist': True, 'min_turnover_required': False}
        )

        self.stdout.write("Creating Evaluators and Admin...")
        ev1 = User.objects.create_user(username='evaluator1', password='demo1234', role='evaluator')
        ev2 = User.objects.create_user(username='evaluator2', password='demo1234', role='evaluator')
        User.objects.create_superuser(username='admin', password='demo1234', role='admin')

        self.stdout.write("Creating Applications...")
        from core.badges import award_badge
        solution_briefs = {
            'MediTriage AI': 'We propose deploying our NLP-based triage engine at 5 pilot PHCs, integrating with the existing teleconsultation queue system. Our model classifies patient symptoms into urgency tiers within 30 seconds, routing critical cases directly to available specialists. We project a 40-45% reduction in average wait times based on our urban clinic pilot data.',
            'DiagnoAI': 'Our AI diagnostic platform can be deployed as a pre-consultation screening layer, analysing patient-reported symptoms and vitals captured by ASHA workers. The system generates a preliminary risk score that helps doctors prioritise their teleconsultation queue. We have validated our models on 50,000+ Indian patient records.',
            'SecureGrid Systems': 'We will deploy our mesh sensor array across the designated perimeter, using solar-powered nodes with encrypted LoRa communication. Each node performs edge-AI threat classification, reducing false alarms by 80% compared to conventional PIR-based systems. Our architecture supports real-time alerting with sub-second latency.',
            'DroneWatch Defence': 'Our autonomous surveillance drones can complement ground-based sensor networks with aerial patrol capabilities. Each drone covers a 10km patrol route with onboard thermal and visual sensors, transmitting alerts to the command centre in real time.',
            'WaterGrid Analytics': 'We will deploy our portable water testing kits across 10 pilot villages, each capable of testing 12 key contaminants including arsenic, fluoride, and coliform bacteria. Results are transmitted via IoT to a central dashboard within minutes, replacing the current 14-day laboratory turnaround.',
            'RuralPay Connect': 'Our fintech platform can facilitate digital payments for PHC services in rural areas, reducing cash-handling overhead. While our core expertise is in payments, we can adapt our offline-first architecture to support health service delivery workflows.',
            'GreenBridge Robotics': 'Our low-cost robotic weeding unit can be adapted for water-quality sensing by mounting portable test cartridges on the same chassis. We propose deploying 10 units across pilot villages to collect daily water quality readings with zero lab turnaround — results stream to the IMIS dashboard in real time at under ₹40 per test.',
        }
        apps_data = [
            (startups['MediTriage AI'],     c1, 'under_evaluation'),
            (startups['DiagnoAI'],          c1, 'under_evaluation'),
            (startups['SecureGrid Systems'],c2, 'shortlisted'),
            (startups['DroneWatch Defence'],c2, 'submitted'),
            (startups['WaterGrid Analytics'],c3,'eligible'),
            (startups['RuralPay Connect'],  c1, 'rejected'),
            (startups['GreenBridge Robotics'], c3, 'shortlisted'),
        ]
        apps = []
        for s_obj, c_obj, app_status in apps_data:
            import hashlib
            brief = solution_briefs[s_obj.name]
            app = Application.objects.create(
                startup=s_obj, challenge=c_obj, status=app_status,
                solution_brief=brief,
                content_hash=hashlib.sha256(brief.encode()).hexdigest(),
            )
            apps.append(app)
            award_badge(s_obj, 'first_application')
            EligibilityResult.objects.create(application=app, rule_name='requires_dpiit', passed=True,
                reason='Startup holds valid DPIIT recognition (ID present).' if s_obj.registration_status == 'dpiit_recognized' else
                       ('Startup is incorporated; DPIIT recognition pending. Eligible to apply and be evaluated; DPIIT recognition required before final contracting.' if s_obj.registration_status == 'incorporated' else
                        'Startup has not yet incorporated. Eligible to apply and be evaluated; incorporation and DPIIT recognition required before final contracting.'))
            EligibilityResult.objects.create(application=app, rule_name='min_team_size', passed=True, reason='No minimum team size required for this challenge.')
            EligibilityResult.objects.create(application=app, rule_name='requires_no_blacklist', passed=True, reason='No blacklist record found.')

        # Evaluation for GreenBridge Robotics application
        greenbridge_app = apps[-1]  # last created = GreenBridge
        Evaluation.objects.create(
            application=greenbridge_app,
            evaluator=ev1,
            round='round1_application',
            score_problem_solution_fit=8,
            score_innovation=7,
            score_feasibility=7,
            score_impact_sustainability=8,
            score_presentation=8,
            comments='Innovative low-cost approach with strong pilot readiness for rural deployment.',
            conflict_of_interest=False,
        )
        # Add evaluations for the under_evaluation apps too (MediTriage and DiagnoAI on c1)
        meditriage_app = apps[0]
        diagnoai_app   = apps[1]
        Evaluation.objects.create(
            application=meditriage_app, evaluator=ev1,
            round='round1_application',
            score_problem_solution_fit=9, score_innovation=8,
            score_feasibility=9, score_impact_sustainability=8, score_presentation=8,
            comments='Excellent fit with the health triage problem.', conflict_of_interest=False,
        )
        Evaluation.objects.create(
            application=diagnoai_app, evaluator=ev2,
            round='round1_application',
            score_problem_solution_fit=7, score_innovation=7,
            score_feasibility=8, score_impact_sustainability=7, score_presentation=7,
            comments='Good solution, solid execution track record.', conflict_of_interest=False,
        )

        self.stdout.write("Creating ScaleUpEntries...")
        ScaleUpEntry.objects.create(
            original_challenge_title='AI-Based Patient Triage Pilot — Nashik PHC Network',
            originating_department_name='Ministry of Health & Family Welfare',
            outcome_summary='Reduced referral processing time by 35% across 4 primary health centres over a 10-week pilot.',
            adopting_departments=['Maharashtra State Health Dept']
        )
        ScaleUpEntry.objects.create(
            original_challenge_title='Smart Irrigation Sensor Deployment — Nagpur District',
            originating_department_name='NITI Aayog — District Innovation Program',
            outcome_summary='Cut water usage by 22% for 150 participating farms while maintaining crop yield.',
            adopting_departments=['Amravati District Agriculture Office', 'Yavatmal District Agriculture Office']
        )
        ScaleUpEntry.objects.create(
            original_challenge_title='Low-Power Border Sensor Trial — Rajasthan Sector',
            originating_department_name='Ministry of Defence — Innovation Cell',
            outcome_summary='Achieved 92% detection accuracy across a 20km pilot stretch with 60% lower power draw than existing systems.',
            adopting_departments=[]
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))
        
        self.stdout.write(f"Users: {User.objects.count()}")
        self.stdout.write(f"Departments: {Department.objects.count()}")
        self.stdout.write(f"Startups: {Startup.objects.count()}")
        self.stdout.write(f"Challenges: {Challenge.objects.count()}")
        self.stdout.write(f"Applications: {Application.objects.count()}")
        self.stdout.write(f"EligibilityResults: {EligibilityResult.objects.count()}")
        self.stdout.write(f"ScaleUpEntries: {ScaleUpEntry.objects.count()}")

        # ── Seed Sahayak AI analyses ───────────────────────────────────────────
        self.stdout.write("Seeding Sahayak AI analyses...")
        try:
            from ai_assist.tasks import _run_analysis, _run_insight
            from core.models import Application as App2
            for app in App2.objects.all():
                _run_analysis(app.id, force=True)
            self.stdout.write("  Analyses generated.")
            for challenge in Challenge.objects.all():
                _run_insight(challenge.id, force=True)
            self.stdout.write("  PS insights generated.")
            from ai_assist.models import SubmissionAnalysis, PSInsight
            self.stdout.write(f"  SubmissionAnalyses: {SubmissionAnalysis.objects.filter(status='done').count()}")
            self.stdout.write(f"  PSInsights: {PSInsight.objects.filter(status='done').count()}")
        except Exception as e:
            self.stdout.write(f"  Sahayak seeding skipped: {e}")
