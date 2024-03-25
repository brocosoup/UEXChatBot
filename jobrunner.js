import fs, { existsSync } from 'node:fs';

function initJSONFile(file) {
	if (!fs.existsSync(file + '.json')) {
		fs.writeFileSync(file + '.json', fs.readFileSync(file + '-template.json'))
	}
}

function readJSON(name)
{
    initJSONFile(name);
    let rawlocale = fs.readFileSync(name + '.json');
    return JSON.parse(rawlocale);
}

function saveJSON(name,content)
{
    fs.writeFileSync(name + '.json',content)
}

var jobs = readJSON('jobs');
var users = readJSON('users');

export function proposeJob(target,context,offer)
{
    jobs.push({
        title: offer.title,
        gain: offer.gain,
        jobgiver: context,
        validated: true,
        employee: null,
        target: target,
        success_employer: null,
        success_employee: null,
        finished: false
    });
}

/*function listJobs()
{
    var message = '';
    for (var job in jobs)
    {
        if (jobs[job].validated === true && jobs[job].employee === null && jobs[job].finished === false)
        {
            if (message === '')
                message = `${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain}`
            else
                message = message + `, ${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain}`
        }
    }
    return message;
}

function listAllJobs()
{
    var message = '';
    for (var job in jobs)
    {
        if (jobs[job].employee === null && jobs[job].finished === false)
        {
            if (message === '')
                message = `${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain} Validated:${jobs[job].validated}`
            else
                message = message + `, ${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain} Validated:${jobs[job].validated}`
        } else if (jobs[job].finished === false) {
            
            if (message === '')
                message = `${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain} Accepted by:${jobs[job].employee['display-name']}  `
            else
                message = message + `, ${job}: ${jobs[job].jobgiver['display-name']} propose '${jobs[job].title}' pour ${jobs[job].gain} Accepted by:${jobs[job].employee['display-name']}  `
        } else {
            if (message === '')
                message = `${job}: ${jobs[job].jobgiver['display-name']} a proposé '${jobs[job].title}' pour ${jobs[job].gain} Accepted by:${jobs[job].employee['display-name']} Success_Employee:${jobs[job].success_employee} Success_Employer:${jobs[job].success_employer}`
            else
                message = message + `, ${job}: ${jobs[job].jobgiver['display-name']} a proposé '${jobs[job].title}' pour ${jobs[job].gain} Accepted by:${jobs[job].employee['display-name']} Success_Employee:${jobs[job].success_employee} Success_Employer:${jobs[job].success_employer}`
        }
    }
    return message;
}*/

export function getJobs()
{
    return jobs;
}

export function validateJob(jobID,value)
{
    jobs[jobID].validated = value;
}

export function acceptJob(jobID,context)
{
    if (jobs[jobID].jobgiver['display-name'] != context['display-name'] && jobs[jobID].employee === null)
    {
        jobs[jobID].employee = context;
        return 0;
    }
    else
    {
        return 1; //Cannot accept that job
    }
}

export function finishJob(jobID,context,success)
{
    if (jobID <= (jobs.length - 1) && jobs[jobID].finished === false)
    {
        if (jobs[jobID].employee != null)
        {
            let ret = 3; //Context is not linked to this job
            if (jobs[jobID].jobgiver['display-name'] === context['display-name'])
            {
                jobs[jobID].success_employer = success;
                ret = 0;
            }
            if (jobs[jobID].employee['display-name'] === context['display-name'])
            {
                jobs[jobID].success_employee = success;
                ret = 0;
            }
            if (jobs[jobID].success_employee != null && jobs[jobID].success_employer != null)
            {
                jobs[jobID].finished = true;
                users = refreshRatings();
                saveALL();
            }
            return ret;
        } else {
            return 1; //No employee defined
        }
    } else {
        return 2; //Job already finished or job not existing
    }
}

function refreshRatings()
{
    var myUsers = [];
    for (var job in jobs)
    {
        if(jobs[job].finished === true)
        {
            var jobgiver = getUID(jobs[job].jobgiver['display-name'],myUsers);
            if (jobgiver == -1)
            {
                myUsers.push({user: jobs[job].jobgiver['display-name'], nb_jobgiver_success: 0, nb_jobgiver_fail:0,nb_employee_success: 0, nb_employee_fail: 0});
                jobgiver = myUsers.length - 1;
            }

            var employee = getUID(jobs[job].employee['display-name'],myUsers);
            if (employee == -1)
            {
                myUsers.push({user: jobs[job].employee['display-name'], nb_jobgiver_success: 0, nb_jobgiver_fail:0,nb_employee_success: 0, nb_employee_fail: 0});
                employee = myUsers.length - 1;
            }

            if (jobs[job].success_employee)
                myUsers[jobgiver].nb_jobgiver_success++;
            else
                myUsers[jobgiver].nb_jobgiver_fail++;

            if (jobs[job].success_employer)
                myUsers[employee].nb_employee_success++;
            else
                myUsers[employee].nb_employee_fail++;
        }
    }
    return myUsers;
}

function getUID(user,myUsers)
{
    for (var uid in myUsers)
    {
        if(myUsers[uid].user === user)
        {
            return uid;
        }
    }
    return -1;
}

export function getRating(uid,myUsers,weight_jobgiver = 1,weight_employee = 1)
{
    const employerRating = myUsers[uid].nb_jobgiver_success / (myUsers[uid].nb_jobgiver_fail + myUsers[uid].nb_jobgiver_success);
    const employeeRating = myUsers[uid].nb_employee_success / (myUsers[uid].nb_employee_fail + myUsers[uid].nb_employee_success);
    return ((weight_jobgiver * employerRating+ weight_employee * employeeRating)/(weight_jobgiver + weight_employee));
}

export function getUserRating(name,rate = 1)
{
    var userID=getUID(name,users)
    var rating=1;
    if (userID != -1)
    {
        rating=getRating(userID,users,rate,rate);
    }
    return rating;
}

export function getUsers()  
{
    return users;
}

export function saveALL(force = false)
{
    saveJSON('jobs',JSON.stringify(jobs));
    saveJSON('users',JSON.stringify(users));
}