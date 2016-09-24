import dotenv from 'dotenv';
import JiraApi from 'jira';
import { Ghee, ghee } from 'ghee';
import Attachment from 'ghee/lib/attachment';
import cache from 'memory-cache';

dotenv.config({ silent: true });

const slack_token = process.env.SLACK_API_TOKEN || '';
const jira_host = process.env.JIRA_HOST || '';
const jira_port = process.env.JIRA_PORT || '';
const jira_user = process.env.JIRA_USER || '';
const jira_pass = process.env.JIRA_PASS || '';

class JiraBot extends Ghee {
  constructor(token) {
    super(token);

    this.jira = new JiraApi.JiraApi('https', jira_host, jira_port, jira_user, jira_pass, '2');
  }

  get_projects() {
    return new Promise((resolve, reject) => {
      if (cache.get('jira_projects')) {
        resolve(cache.get('jira_projects'));
      }

      this.jira.listProjects((err, projects) => {
        if (!err) {
          // Cache a project look up for 1 hour.
          cache.put('jira_projects', projects, 3600000);
          resolve(projects);
        } else {
          reject(err);
        }
      });
    });
  }

  find_user(key) {
    return new Promise((resolve, reject) => {
      if (cache.get(`user|${key}`)) {
        resolve(cache.get(`user|${key}`));
      }

      this.jira.searchUsers(key, 0, 1, true, true, (err, user) => {
        if (!err) {
          // Cache a user look up for 1 day
          cache.put(`user|${key}`, user[0], 86400000);
          resolve(user[0]);
        } else {
          reject(err);
        }
      });
    });
  }

  @ghee
  projects(args) {
    return new Promise((resolve, reject) => {
      let keys = [];

      this.get_projects().then((projects) => {
        for (var project of projects) {
          keys.push(project.key);
        }

        resolve('JIRA Projects keys: ' + keys.join(', '));
      });
    });
  }

  @ghee
  project(args) {
    return new Promise((resolve, reject) => {
      this.get_projects().then((projects) => {
        for (var project of projects) {
          if (project.key == args[0]) {
            resolve(`${project.key} is the key for ${project.name}`);
            return;
          }
        }

        reject('Err: No such project key found.');
      });
    });
  }

  @ghee
  create(args, from) {
    return new Promise((resolve, reject) => {
      let [ key, ...params ] = args;
      let index = params.findIndex(x => x == '=&gt;');
      let summary, description = '';

      if (index >= 0 && index < params.length) {
        summary = params.slice(0, index).join(' ');
        description = params.slice(index + 1).join(' ');
      } else {
        summary = params.join(' ');
      }

      this.jira.addNewIssue({
        'fields': {
          'project': {
            'key': key
          },
          'summary': summary,
          'description': description,
          'issuetype': {
            'id': 3 // 'task' by default
          },
          'labels': [
            'slack-created'
          ]
        }
      }, (err, issue) => {
        if (err) {
          reject('Unable to create ticket - did you specify a valid project key?');
          return;
        }

        this.find_user(from.profile.email).then((user) => {
          this.jira.updateIssue(issue.key, {
            'fields': {
              'reporter': {
                'name': user.name
              }
            }
          }, (err, response) => { });
        });

        this.jira.addComment(issue.key, `Issue created via Slack JiraBot by ${from.profile.real_name}.`, (err, issue) => { });

        resolve(`Ticket created! Visit https://${jira_host}/browse/${issue.key} to view or edit the ticket.`);
      });
    });
  }

  @ghee
  catch_all(msg) {
    const jira_ticket_format = /\b(([A-Z]+)\-\d+)\b/;

    if (jira_ticket_format.test(msg) && msg.indexOf(jira_host) === -1) {
      let match = msg.match(jira_ticket_format);
      let ticket_id = match[1].toUpperCase();

      return new Promise((resolve, reject) => {
        this.jira.findIssue(ticket_id, (err, issue) => {
          if (!err) {
            let ticket = new Attachment();
            ticket.fallback = `${issue.key}: "${issue.fields.summary}" (${issue.fields.status.name}).`;
            ticket.color = '#37465D';
            ticket.title = `${issue.key}: ${issue.fields.summary}`;
            ticket.title_link = `https://${jira_host}:${jira_port}/browse/${issue.key}/`;
            ticket.addField('Status', issue.fields.status.name, true);
            ticket.addField('Reporter', issue.fields.reporter.displayName, true);
            ticket.addField('Assignee', (issue.fields.assignee) ? issue.fields.assignee.displayName : '_Unassigned_', true);

            resolve(ticket);
          } else {
            reject(err);
          }
        });
      });
    }
  }

  @ghee
  help(args) {
    return 'Use the following commands:\n' +
    '> `.projects` - Get a list of all projects keys.\n' +
    '> `.project [KEY]` - Get information about a specific project.\n' +
    '> `.create [KEY] [TITLE]` - Create a new ticket with the title in the selected project.\n' +
    '> `.create [KEY] [TITLE] => [DESCRIPTION]` - Create a new ticket with the title and description in the selected project.\n' +
    'I will also listen for ticket keys in the JIRA format (KEY-ID) and look them up for you.';
  }
}

var jirabot = new JiraBot(slack_token);
