import 'package:flutter/material.dart';
import 'package:percent_indicator/percent_indicator.dart';
import '../models/donation_case.dart';
import '../services/data_service.dart';
import '../theme/app_theme.dart';
import 'donate_screen.dart';

class CasesScreen extends StatefulWidget {
  const CasesScreen({super.key});

  @override
  State<CasesScreen> createState() => _CasesScreenState();
}

class _CasesScreenState extends State<CasesScreen> {
  String filter = 'all';

  List<DonationCase> get filtered {
    if (filter == 'all') return DataService.cases;
    return DataService.cases.where((c) => c.category == filter).toList();
  }

  Color urgencyColor(String u) {
    switch (u) {
      case 'critical':
        return AppTheme.danger;
      case 'high':
        return AppTheme.warning;
      default:
        return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Center(
                child: Text('D', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 10),
            const Text('DonationChain'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Hero banner
          Container(
            width: double.infinity,
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, Color(0xFF0E4DB5), AppTheme.accent],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Every Rupee Tracked',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'Zero middleman • Direct to verified vendors',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _stat('1.2M+', 'Donors'),
                    const SizedBox(width: 20),
                    _stat('48k+', 'Cases'),
                    const SizedBox(width: 20),
                    _stat('95%', 'Fraud Drop'),
                  ],
                ),
              ],
            ),
          ),
          // Filters
          SizedBox(
            height: 42,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _filterChip('all', 'All'),
                _filterChip('medical', 'Medical'),
                _filterChip('education', 'Education'),
                _filterChip('food', 'Food'),
                _filterChip('utility', 'Utility'),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              itemCount: filtered.length,
              itemBuilder: (ctx, i) {
                final c = filtered[i];
                return _caseCard(c);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _stat(String value, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 11)),
      ],
    );
  }

  Widget _filterChip(String key, String label) {
    final selected = filter == key;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => setState(() => filter = key),
        selectedColor: AppTheme.primary.withValues(alpha: 0.15),
        checkmarkColor: AppTheme.primary,
        labelStyle: TextStyle(
          color: selected ? AppTheme.primary : Colors.grey.shade700,
          fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
    );
  }

  Widget _caseCard(DonationCase c) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => DonateScreen(caseItem: c)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: urgencyColor(c.urgency).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      c.urgency.toUpperCase(),
                      style: TextStyle(
                        color: urgencyColor(c.urgency),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const Spacer(),
                  if (c.verified)
                    const Row(
                      children: [
                        Icon(Icons.verified, size: 16, color: AppTheme.success),
                        SizedBox(width: 4),
                        Text('Verified', style: TextStyle(color: AppTheme.success, fontSize: 12, fontWeight: FontWeight.w600)),
                      ],
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Text(c.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${c.city} • ${c.vendor}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('PKR ${c.raised.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text('Goal ${c.amount.toStringAsFixed(0)}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                ],
              ),
              const SizedBox(height: 8),
              LinearPercentIndicator(
                lineHeight: 8,
                percent: c.progress,
                backgroundColor: Colors.grey.shade200,
                progressColor: AppTheme.primary,
                barRadius: const Radius.circular(8),
                padding: EdgeInsets.zero,
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => DonateScreen(caseItem: c)),
                    );
                  },
                  child: const Text('Donate Now'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Helper for Colors.slate
