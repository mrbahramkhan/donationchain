import 'package:flutter/material.dart';
import '../services/data_service.dart';
import '../services/device_api.dart';
import '../theme/app_theme.dart';
import 'apply_screen.dart';
import 'home_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phoneCtrl = TextEditingController();
  final otpCtrl = TextEditingController();
  final nameCtrl = TextEditingController();
  bool otpSent = false;
  bool loading = false;
  /// donor | seeker
  String role = 'donor';

  void sendOtp() {
    if (phoneCtrl.text.trim().length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter valid phone number')),
      );
      return;
    }
    setState(() => otpSent = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('OTP sent (Demo: 123456)')),
    );
  }

  Future<void> verify() async {
    if (otpCtrl.text.trim() != '123456') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid OTP. Use 123456')),
      );
      return;
    }
    setState(() => loading = true);
    final name = nameCtrl.text.trim().isEmpty
        ? (role == 'seeker' ? 'Help seeker' : 'Demo Donor')
        : nameCtrl.text.trim();
    await DataService.setUser(name, phoneCtrl.text.trim(), role: role);
    DeviceApi.registerToken(phoneCtrl.text.trim().isEmpty ? 'guest' : phoneCtrl.text.trim());
    if (!mounted) return;
    setState(() => loading = false);
    if (role == 'seeker') {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const ApplyScreen()),
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeShell()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Center(
                    child: Text(
                      'D',
                      style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'DonationChain',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'Transparent giving · Separate paths for donors & seekers',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
              ),
              const SizedBox(height: 28),

              // Role selection — international clear dual path
              Text('I am here to…', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey.shade800)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _RoleCard(
                      selected: role == 'donor',
                      icon: Icons.volunteer_activism_outlined,
                      title: 'Donate',
                      subtitle: 'Support verified cases',
                      onTap: () => setState(() => role = 'donor'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _RoleCard(
                      selected: role == 'seeker',
                      icon: Icons.handshake_outlined,
                      title: 'Need help',
                      subtitle: 'Apply for support',
                      onTap: () => setState(() => role = 'seeker'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              TextField(
                controller: nameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Full name (optional)',
                  prefixIcon: Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  hintText: '03XX XXXXXXX or +country…',
                  prefixIcon: Icon(Icons.phone_android),
                ),
              ),
              const SizedBox(height: 16),
              if (!otpSent)
                ElevatedButton(
                  onPressed: sendOtp,
                  child: Text(role == 'seeker' ? 'Send OTP & continue to apply' : 'Send OTP'),
                )
              else ...[
                TextField(
                  controller: otpCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Enter OTP',
                    hintText: '6-digit code',
                    prefixIcon: Icon(Icons.lock_outline),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: loading ? null : verify,
                  child: loading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Text(role == 'seeker' ? 'Verify & open apply form' : 'Verify & Login'),
                ),
              ],
              const SizedBox(height: 20),
              if (role == 'donor')
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const HomeShell()),
                    );
                  },
                  child: const Text('Browse cases as guest'),
                )
              else
                TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ApplyScreen()),
                    );
                  },
                  child: const Text('Open apply form without OTP'),
                ),
              const SizedBox(height: 12),
              Text(
                'Demo OTP: 123456 · Roles stay separate by design',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _RoleCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppTheme.primary.withValues(alpha: 0.1) : Colors.grey.shade50,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: selected ? AppTheme.primary : Colors.grey.shade300,
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon, color: selected ? AppTheme.primary : Colors.grey.shade600),
              const SizedBox(height: 8),
              Text(title, style: TextStyle(fontWeight: FontWeight.w700, color: selected ? AppTheme.primary : Colors.black87)),
              const SizedBox(height: 2),
              Text(subtitle, textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
            ],
          ),
        ),
      ),
    );
  }
}
