import db from '../config/database.js';

export const getSeekerDashboardStats = async (req, res) => {
    try {
        const userId = req.user.id; 

        // Get stats grouped by status
        const [statsRows] = await db.query(
            `SELECT status, COUNT(*) as count 
             FROM applications 
             WHERE user_id = ?
             GROUP BY status`,
            [userId]
        );

        const stats = {
            applied: 0,
            shortlisted: 0,
            rejected: 0,
            hired: 0,
            total: 0
        };

        statsRows.forEach(row => {
            const status = row.status.toLowerCase();
            if (stats[status] !== undefined) {
                stats[status] = parseInt(row.count);
            }
            stats.total += parseInt(row.count);
        });

        // Get Recent 5 Applications - USE created_at INSTEAD OF applied_at
        const [recentApps] = await db.query(
            `SELECT a.id, a.job_id, a.status, a.created_at as applied_at,
                    j.job_title, j.company_name
             FROM applications a 
             LEFT JOIN jobs j ON a.job_id = j.id 
             WHERE a.user_id = ?
             ORDER BY a.created_at DESC 
             LIMIT 5`,
            [userId]
        );

        // Format the response to match what the frontend expects
        const formattedApps = recentApps.map(app => ({
            id: app.id,
            job_title: app.job_title || 'Unknown Job',
            company_name: app.company_name || 'Unknown Company',
            applied_at: app.applied_at, // This is actually created_at but renamed
            status: app.status
        }));

        res.json({ 
            success: true, 
            stats, 
            recentApps: formattedApps 
        });

    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ 
            message: "Server error fetching dashboard data",
            error: error.message 
        });
    }
};